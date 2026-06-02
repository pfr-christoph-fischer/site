import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./lib/env.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
loadEnv(projectRoot);

const outputRoot = path.join(projectRoot, "src", "content", "projects", "imported");
const includeForks = /^true$/i.test(process.env.OPEN_SOURCE_INCLUDE_FORKS || "false");
const prune = process.argv.includes("--prune");
const dryRun = process.argv.includes("--dry-run");

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
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    watchers: repo.watchers_count || 0,
    language: repo.language || "",
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : "",
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
    stars: repo.stars_count || 0,
    forks: repo.forks_count || 0,
    watchers: repo.watchers_count || repo.watchers || 0,
    language: repo.language || "",
    license: repo.license || "",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    archived: !!repo.archived,
    fork: !!repo.fork,
    defaultBranch: repo.default_branch || "",
    createdAt: repo.created_at || new Date().toISOString(),
    updatedAt: repo.updated_at || repo.created_at || new Date().toISOString()
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
    `source: ${repo.source}`,
    `source_scope: ${repo.scopeType}`,
    `repository_owner: ${escapeYamlString(repo.owner)}`,
    `repository_owner_url: ${escapeYamlString(repo.ownerUrl)}`,
    `repository_url: ${escapeYamlString(repo.repositoryUrl)}`,
    `repository_platform: ${escapeYamlString(repo.source === "github" ? "GitHub" : "Codeberg")}`,
    `homepage_url: ${escapeYamlString(repo.homepage)}`,
    `license: ${escapeYamlString(repo.license)}`,
    `language: ${escapeYamlString(repo.language)}`,
    `stars: ${repo.stars}`,
    `forks: ${repo.forks}`,
    `watchers: ${repo.watchers}`,
    `archived: ${repo.archived ? "true" : "false"}`,
    `is_fork: ${repo.fork ? "true" : "false"}`,
    `default_branch: ${escapeYamlString(repo.defaultBranch)}`,
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

  if (repo.description) {
    lines.push(markdownEscape(repo.description), "");
  } else {
    lines.push("Automatisch importierter Repository-Eintrag.", "");
  }

  lines.push("## Repository", "");
  lines.push(`- Plattform: ${repo.source === "github" ? "GitHub" : "Codeberg"}`);
  lines.push(`- Typ: ${repo.scopeType === "organization" ? "Organisation" : "Persönlich"}`);
  lines.push(`- Eigentümer: [${markdownEscape(repo.owner)}](${repo.ownerUrl || repo.repositoryUrl})`);
  lines.push(`- Code: [${markdownEscape(repo.repositoryUrl)}](${repo.repositoryUrl})`);

  if (repo.homepage) {
    lines.push(`- Website: [${markdownEscape(repo.homepage)}](${repo.homepage})`);
  }
  if (repo.defaultBranch) {
    lines.push(`- Standard-Branch: \`${markdownEscape(repo.defaultBranch)}\``);
  }
  if (repo.license) {
    lines.push(`- Lizenz: ${markdownEscape(repo.license)}`);
  }
  if (repo.language) {
    lines.push(`- Hauptsprache: ${markdownEscape(repo.language)}`);
  }
  lines.push(`- Sterne: ${repo.stars}`);
  lines.push(`- Forks: ${repo.forks}`);
  lines.push(`- Beobachter: ${repo.watchers}`);

  if (repo.topics.length) {
    lines.push("", "## Themen", "");
    for (const topic of repo.topics) {
      lines.push(`- ${markdownEscape(topic)}`);
    }
  }

  if (repo.archived || repo.fork) {
    lines.push("", "## Status", "");
    if (repo.archived) {
      lines.push("- Dieses Repository ist archiviert.");
    }
    if (repo.fork) {
      lines.push("- Dieses Repository ist ein Fork.");
    }
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

  return repos;
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

  return repos;
}

async function main() {
  ensureDir(outputRoot);

  const imported = [
    ...await importGithubRepos(),
    ...await importCodebergRepos()
  ].filter((repo) => !repo.fork || includeForks);

  const deduped = new Map();
  for (const repo of imported) {
    deduped.set(repo.slug, repo);
  }

  const written = [];
  for (const repo of [...deduped.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    written.push(writeRepoEntry(repo));
  }

  const removed = prune ? pruneRemovedRepos(new Set(deduped.keys())) : [];

  console.log(`${dryRun ? "Planned" : "Imported"} ${written.length} repositories into ${outputRoot}`);
  if (removed.length) {
    console.log(`${dryRun ? "Would remove" : "Removed"} ${removed.length} stale imported repository directories.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
