import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { loadEnv } from "./lib/env.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
loadEnv(projectRoot);

const outputRoot = path.join(projectRoot, "src", "content", "projects");
const legacyOutputRoot = path.join(outputRoot, "imported");
const includeForks = /^true$/i.test(process.env.OPEN_SOURCE_INCLUDE_FORKS || "false");
const prune = process.argv.includes("--prune");
const dryRun = process.argv.includes("--dry-run");
const fallbackLicenseName = "GPL 3.0+";
const fallbackLicenseUrl = "https://www.gnu.org/licenses/gpl-3.0.txt";

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function slugify(input) {
  return String(input || "")
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeYamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function markdownEscape(value) {
  return String(value ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function fetchOptionalJson(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function fetchAllPages(urlBuilder, options = {}) {
  const all = [];
  let page = 1;
  while (true) {
    const url = urlBuilder(page);
    const items = await fetchJson(url, options);
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);
    if (items.length < 100) break;
    page += 1;
  }
  return all;
}

function normalizeGithubRepo(repo, scopeType) {
  return {
    source: "github",
    scopeType,
    owner: repo.owner?.login || "",
    ownerUrl: repo.owner?.html_url || "",
    name: repo.name,
    slug: slugify(`github-${repo.owner?.login || "owner"}-${repo.name}`),
    title: repo.name,
    summary: repo.description || `${repo.name} auf GitHub.`,
    description: repo.description || "",
    repositoryUrl: repo.html_url,
    homepage: repo.homepage || "",
    language: repo.language || "",
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : "",
    licenseUrl: "",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    archived: !!repo.archived,
    fork: !!repo.fork,
    defaultBranch: repo.default_branch || "",
    createdAt: repo.created_at || new Date().toISOString(),
    updatedAt: repo.pushed_at || repo.updated_at || repo.created_at || new Date().toISOString()
  };
}

function normalizeCodebergRepo(repo, scopeType) {
  return {
    source: "codeberg",
    scopeType,
    owner: repo.owner?.username || repo.owner?.login || "",
    ownerUrl: repo.owner?.website || repo.owner?.html_url || "",
    name: repo.name,
    slug: slugify(`codeberg-${repo.owner?.username || repo.owner?.login || "owner"}-${repo.name}`),
    title: repo.name,
    summary: repo.description || `${repo.name} auf Codeberg.`,
    description: repo.description || "",
    repositoryUrl: repo.html_url,
    homepage: repo.website || "",
    language: repo.language || "",
    license: repo.license || "",
    licenseUrl: "",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    archived: !!repo.archived,
    fork: !!repo.fork,
    defaultBranch: repo.default_branch || "",
    createdAt: repo.created_at || new Date().toISOString(),
    updatedAt: repo.updated_at || repo.created_at || new Date().toISOString()
  };
}

function decodeContent(content, encoding) {
  if (!content) return "";
  if (encoding === "base64") {
    return Buffer.from(String(content).replace(/\n/g, ""), "base64").toString("utf8");
  }
  return String(content);
}

function stripReadmeNoise(markdown) {
  return String(markdown || "")
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function normalizeReadmeBody(markdown, repoTitle) {
  let body = stripReadmeNoise(markdown);
  if (!body) return "";

  const headingPattern = new RegExp(`^#\\s+${repoTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
  body = body.replace(headingPattern, "").trim();
  return body;
}

function plainTextFromMarkdown(markdown) {
  return String(markdown || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSummary(readmeBody, fallback) {
  const paragraphs = stripReadmeNoise(readmeBody)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (paragraph.startsWith("#")) continue;
    if (/^!\[.*\]\(.*\)$/.test(paragraph)) continue;
    if (/^\[[^\]]+\]:\s+\S+/.test(paragraph)) continue;
    const summary = plainTextFromMarkdown(paragraph);
    if (summary) {
      return summary.length > 220 ? `${summary.slice(0, 217).trimEnd()}...` : summary;
    }
  }

  return fallback || "";
}

async function fetchGithubContents(owner, repo, filePath, headers, ref) {
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return fetchOptionalJson(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}${suffix}`,
    { headers }
  );
}

async function fetchGithubLicense(owner, repo, headers) {
  return fetchOptionalJson(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/license`,
    { headers }
  );
}

async function fetchCodebergContents(owner, repo, filePath, headers, ref) {
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return fetchOptionalJson(
    `https://codeberg.org/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}${suffix}`,
    { headers }
  );
}

async function enrichGithubRepo(repo, headers) {
  const readmeFile = await fetchGithubContents(repo.owner, repo.name, "README.md", headers, repo.defaultBranch);
  const licenseFile = await fetchGithubLicense(repo.owner, repo.name, headers)
    || await fetchGithubContents(repo.owner, repo.name, "LICENSE", headers, repo.defaultBranch);

  const readmeBody = normalizeReadmeBody(
    decodeContent(readmeFile?.content, readmeFile?.encoding),
    repo.title
  );

  return {
    ...repo,
    readmeBody,
    summary: extractSummary(readmeBody, repo.description || repo.summary),
    license: licenseFile?.license?.spdx_id && licenseFile.license.spdx_id !== "NOASSERTION"
      ? licenseFile.license.spdx_id
      : repo.license || fallbackLicenseName,
    licenseUrl: licenseFile?.html_url || repo.licenseUrl || (repo.license ? "" : fallbackLicenseUrl)
  };
}

async function enrichCodebergRepo(repo, headers) {
  const readmeFile = await fetchCodebergContents(repo.owner, repo.name, "README.md", headers, repo.defaultBranch);
  const licenseFile = await fetchCodebergContents(repo.owner, repo.name, "LICENSE", headers, repo.defaultBranch);

  const readmeBody = normalizeReadmeBody(
    decodeContent(readmeFile?.content, readmeFile?.encoding),
    repo.title
  );

  return {
    ...repo,
    readmeBody,
    summary: extractSummary(readmeBody, repo.description || repo.summary),
    license: repo.license || fallbackLicenseName,
    licenseUrl: licenseFile?.html_url || (repo.license ? "" : fallbackLicenseUrl)
  };
}

function repoToMarkdown(repo) {
  const tags = ["project", "open-source", repo.source, repo.scopeType];
  if (repo.language) tags.push(slugify(repo.language));
  for (const topic of repo.topics) tags.push(slugify(topic));

  const technologies = [
    repo.language || null,
    ...repo.topics
  ].filter(Boolean);

  const lines = [
    "---",
    `title: ${escapeYamlString(repo.title)}`,
    `summary: ${escapeYamlString(repo.summary)}`,
    `date: ${repo.createdAt.slice(0, 10)}`,
    `updated: ${repo.updatedAt.slice(0, 10)}`,
    `repository_owner: ${escapeYamlString(repo.owner)}`,
    `repository_owner_url: ${escapeYamlString(repo.ownerUrl)}`,
    `repository_url: ${escapeYamlString(repo.repositoryUrl)}`,
    `repository_platform: ${escapeYamlString(repo.source === "github" ? "GitHub" : "Codeberg")}`,
    `homepage_url: ${escapeYamlString(repo.homepage)}`,
    `license: ${escapeYamlString(repo.license)}`,
    `license_url: ${escapeYamlString(repo.licenseUrl || "")}`,
    `language: ${escapeYamlString(repo.language)}`,
    "tags:"
  ];

  for (const tag of [...new Set(tags.filter(Boolean))]) {
    lines.push(`  - ${escapeYamlString(tag)}`);
  }

  if (technologies.length) {
    lines.push("technologies:");
    for (const technology of [...new Set(technologies)]) {
      lines.push(`  - ${escapeYamlString(technology)}`);
    }
  }

  lines.push("---", "");

  if (repo.readmeBody) {
    lines.push(repo.readmeBody, "");
  } else if (repo.description) {
    lines.push(markdownEscape(repo.description), "");
  } else {
    lines.push("Automatisch importierter Repository-Eintrag.", "");
  }

  lines.push("", "<!-- managed-by: import-open-source-repos -->", "");
  return `${lines.join("\n")}\n`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeRepoEntry(repo) {
  const dir = path.join(outputRoot, repo.slug);
  const file = path.join(dir, "index.md");
  const content = repoToMarkdown(repo);
  if (!dryRun) {
    ensureDir(dir);
    fs.writeFileSync(file, content, "utf8");
  }
  return file;
}

function pruneRemovedRepos(activeSlugs) {
  if (!fs.existsSync(outputRoot)) return [];
  const removed = [];
  for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (activeSlugs.has(entry.name)) continue;
    const dir = path.join(outputRoot, entry.name);
    const marker = path.join(dir, "index.md");
    if (fs.existsSync(marker) && fs.readFileSync(marker, "utf8").includes("managed-by: import-open-source-repos")) {
      removed.push(dir);
      if (!dryRun) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }
  return removed;
}

function cleanupLegacyImportedRepos() {
  if (!fs.existsSync(legacyOutputRoot)) return [];
  const removed = [];

  for (const entry of fs.readdirSync(legacyOutputRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(legacyOutputRoot, entry.name);
    const marker = path.join(dir, "index.md");
    if (!fs.existsSync(marker)) continue;
    if (!fs.readFileSync(marker, "utf8").includes("managed-by: import-open-source-repos")) continue;
    removed.push(dir);
    if (!dryRun) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  if (!dryRun && fs.existsSync(legacyOutputRoot) && fs.readdirSync(legacyOutputRoot).length === 0) {
    fs.rmdirSync(legacyOutputRoot);
  }

  return removed;
}

async function importGithubRepos() {
  const users = splitList(process.env.OPEN_SOURCE_GITHUB_USERS);
  const orgs = splitList(process.env.OPEN_SOURCE_GITHUB_ORGS);
  const headers = {
    "User-Agent": "christoph-fischer-2026-importer",
    "Accept": "application/vnd.github+json"
  };
  if (process.env.OPEN_SOURCE_GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.OPEN_SOURCE_GITHUB_TOKEN}`;
  }

  const repos = [];
  for (const user of users) {
    const items = await fetchAllPages(
      (page) => `https://api.github.com/users/${encodeURIComponent(user)}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
      { headers }
    );
    repos.push(...items.map((repo) => normalizeGithubRepo(repo, "user")));
  }

  for (const org of orgs) {
    const items = await fetchAllPages(
      (page) => `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?type=public&sort=updated&per_page=100&page=${page}`,
      { headers }
    );
    repos.push(...items.map((repo) => normalizeGithubRepo(repo, "organization")));
  }

  const filtered = repos.filter((repo) => !repo.fork || includeForks);
  const enriched = [];
  for (const repo of filtered) {
    enriched.push(await enrichGithubRepo(repo, headers));
  }

  return enriched;
}

async function importCodebergRepos() {
  const users = splitList(process.env.OPEN_SOURCE_CODEBERG_USERS);
  const orgs = splitList(process.env.OPEN_SOURCE_CODEBERG_ORGS);
  const headers = { Accept: "application/json" };
  if (process.env.OPEN_SOURCE_CODEBERG_TOKEN) {
    headers.Authorization = `token ${process.env.OPEN_SOURCE_CODEBERG_TOKEN}`;
  }

  const repos = [];
  for (const user of users) {
    const items = await fetchAllPages(
      (page) => `https://codeberg.org/api/v1/users/${encodeURIComponent(user)}/repos?page=${page}&limit=100`,
      { headers }
    );
    repos.push(...items.map((repo) => normalizeCodebergRepo(repo, "user")));
  }

  for (const org of orgs) {
    const items = await fetchAllPages(
      (page) => `https://codeberg.org/api/v1/orgs/${encodeURIComponent(org)}/repos?page=${page}&limit=100`,
      { headers }
    );
    repos.push(...items.map((repo) => normalizeCodebergRepo(repo, "organization")));
  }

  const filtered = repos.filter((repo) => !repo.fork || includeForks);
  const enriched = [];
  for (const repo of filtered) {
    enriched.push(await enrichCodebergRepo(repo, headers));
  }

  return enriched;
}

async function main() {
  ensureDir(outputRoot);

  const imported = [
    ...await importGithubRepos(),
    ...await importCodebergRepos()
  ];

  const deduped = new Map();
  for (const repo of imported) {
    deduped.set(repo.slug, repo);
  }

  const written = [];
  for (const repo of [...deduped.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    written.push(writeRepoEntry(repo));
  }

  const removed = prune ? pruneRemovedRepos(new Set(deduped.keys())) : [];
  const legacyRemoved = cleanupLegacyImportedRepos();

  console.log(`${dryRun ? "Planned" : "Imported"} ${written.length} repositories into ${outputRoot}`);
  if (removed.length) {
    console.log(`${dryRun ? "Would remove" : "Removed"} ${removed.length} stale imported repository directories.`);
  }
  if (legacyRemoved.length) {
    console.log(`${dryRun ? "Would remove" : "Removed"} ${legacyRemoved.length} legacy repository directories from ${legacyOutputRoot}.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
