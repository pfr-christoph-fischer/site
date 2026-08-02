import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import matter from "gray-matter";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const contentRoot = path.join(projectRoot, "src", "content");
const gitmodulesPath = path.join(projectRoot, ".gitmodules");
const skipField = "submodule_skip";
const listOnly = process.argv.includes("--list");

function readConfiguredSubmodulePaths() {
  if (!fs.existsSync(gitmodulesPath)) return new Set();
  const raw = fs.readFileSync(gitmodulesPath, "utf8");
  const matches = raw.matchAll(/^\s*path\s*=\s*(.+)\s*$/gm);
  return new Set([...matches].map((match) => match[1].trim().replace(/\\/g, "/")));
}

function readCandidates() {
  const configuredSubmodules = readConfiguredSubmodulePaths();
  const candidates = [];

  for (const typeEntry of fs.readdirSync(contentRoot, { withFileTypes: true })) {
    if (!typeEntry.isDirectory()) continue;

    const type = typeEntry.name;
    const typeRoot = path.join(contentRoot, type);

    for (const entry of fs.readdirSync(typeRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const contentPath = path.join(typeRoot, entry.name);
      const indexPath = path.join(contentPath, "index.md");
      if (!fs.existsSync(indexPath)) continue;

      const relativePath = path.relative(projectRoot, contentPath).replace(/\\/g, "/");
      if (configuredSubmodules.has(relativePath)) continue;
      if (fs.existsSync(path.join(contentPath, ".git"))) continue;

      const parsed = matter(fs.readFileSync(indexPath, "utf8"));
      const data = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
      if (data[skipField] === true) continue;

      candidates.push({
        type,
        folder: entry.name,
        contentPath,
        indexPath,
        relativePath,
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : entry.name,
        summary: typeof data.summary === "string" && data.summary.trim() ? data.summary.trim() : ""
      });
    }
  }

  return candidates.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function printCandidate(candidate) {
  console.log(`${candidate.relativePath} (${candidate.title})`);
  if (candidate.summary) {
    console.log(`  ${candidate.summary}`);
  }
}

function markSkipped(candidate) {
  const parsed = matter(fs.readFileSync(candidate.indexPath, "utf8"));
  const data = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
  if (data[skipField] === true) return;
  data[skipField] = true;
  fs.writeFileSync(candidate.indexPath, matter.stringify(parsed.content, data));
}

function runExtractor(candidate) {
  const result = spawnSync("npm", ["run", "extract:material", "--", candidate.folder, candidate.type], {
    cwd: projectRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`extract:material failed for ${candidate.relativePath}`);
  }
}

async function promptForCandidate(candidate, rl) {
  printCandidate(candidate);
  const answer = (await rl.question("Extract as submodule? [y]es / [n]o-and-skip / [q]uit: ")).trim().toLowerCase();

  if (answer === "q" || answer === "quit") {
    return "quit";
  }

  if (answer === "y" || answer === "yes") {
    runExtractor(candidate);
    return "extracted";
  }

  if (answer === "n" || answer === "no" || answer === "") {
    markSkipped(candidate);
    console.log(`Marked ${candidate.relativePath} with ${skipField}: true`);
    return "skipped";
  }

  console.log(`Unrecognized answer "${answer}".`);
  return promptForCandidate(candidate, rl);
}

async function main() {
  const candidates = readCandidates();

  if (candidates.length === 0) {
    console.log("No non-submodule content candidates found.");
    return;
  }

  if (listOnly || !input.isTTY || !output.isTTY) {
    for (const candidate of candidates) {
      printCandidate(candidate);
    }
    console.log(`Found ${candidates.length} non-submodule content candidates.`);
    return;
  }

  const rl = createInterface({ input, output });
  try {
    for (const candidate of candidates) {
      const outcome = await promptForCandidate(candidate, rl);
      if (outcome === "quit") {
        console.log("Stopped without checking remaining candidates.");
        return;
      }
    }
  } finally {
    rl.close();
  }

  console.log("Finished checking submodule candidates.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
