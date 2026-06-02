import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cacheRoot = path.join(projectRoot, ".cache");
const manifestPath = path.join(cacheRoot, "copied-entry-media.json");
const siteRoot = path.join(projectRoot, "_site");
const contentRoot = path.join(projectRoot, "src", "content");

function getFiles(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...getFiles(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.startsWith("---\n")) return null;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return yaml.load(raw.slice(4, end));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) return { copiedFiles: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      copiedFiles: Array.isArray(parsed.copiedFiles) ? parsed.copiedFiles : []
    };
  } catch {
    return { copiedFiles: [] };
  }
}

function writeManifest(data) {
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
}

function removeIfExists(filePath) {
  if (!fs.existsSync(filePath)) return false;
  fs.rmSync(filePath, { force: true });
  return true;
}

function copyIfExists(sourceDir, outputDir, relativePath) {
  if (!relativePath || typeof relativePath !== "string" || relativePath.startsWith("/")) return null;
  const source = path.join(sourceDir, relativePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return null;
  const target = path.join(outputDir, relativePath);
  ensureDir(path.dirname(target));
  const sourceStat = fs.statSync(source);
  const targetExists = fs.existsSync(target);

  if (targetExists) {
    const targetStat = fs.statSync(target);
    const sameSize = targetStat.size === sourceStat.size;
    const targetUpToDate = targetStat.mtimeMs >= sourceStat.mtimeMs;
    if (sameSize && targetUpToDate) {
      return { target, copied: false };
    }
  }

  fs.copyFileSync(source, target);
  fs.utimesSync(target, sourceStat.atime, sourceStat.mtime);
  return { target, copied: true };
}

function detectContentType(indexFile) {
  const normalized = indexFile.replace(/\\/g, "/");
  if (normalized.includes("/src/content/sermons/")) return "sermon";
  if (normalized.includes("/src/content/posts/")) return "post";
  if (normalized.includes("/src/content/materials/")) return "material";
  if (normalized.includes("/src/content/projects/")) return "project";
  if (normalized.includes("/src/content/podcasts/")) return "podcast";
  return null;
}

function getOutputDir(indexFile, data) {
  const contentType = detectContentType(indexFile);
  const slug = typeof data.slug === "string" && data.slug.trim()
    ? data.slug.trim()
    : path.basename(path.dirname(indexFile));

  if (contentType === "sermon") {
    const date = new Date(data.date);
    const year = Number.isNaN(date.getTime()) ? "undated" : String(date.getUTCFullYear());
    return path.join(siteRoot, "predigten", year, slug);
  }

  if (contentType === "post") return path.join(siteRoot, "blog", slug);
  if (contentType === "material") return path.join(siteRoot, "material", slug);
  if (contentType === "project") return path.join(siteRoot, "projekte", slug);
  if (contentType === "podcast") return path.join(siteRoot, "podcast", slug);
  return null;
}

function main() {
  const contentIndexes = getFiles(contentRoot, (file) => file.endsWith(`${path.sep}index.md`) || file.endsWith("/index.md"));
  const previousManifest = readManifest();
  const currentTargets = new Set();
  let copied = 0;

  for (const indexFile of contentIndexes) {
    const data = parseFrontmatter(indexFile);
    if (!data) continue;

    const sourceDir = path.dirname(indexFile);
    const outputDir = getOutputDir(indexFile, data);

    if (!outputDir || !fs.existsSync(outputDir)) continue;

    const coverTarget = copyIfExists(sourceDir, outputDir, data.cover);
    if (coverTarget) {
      currentTargets.add(coverTarget.target);
      if (coverTarget.copied) copied += 1;
    }

    const audioTarget = copyIfExists(sourceDir, outputDir, data.audio);
    if (audioTarget) {
      currentTargets.add(audioTarget.target);
      if (audioTarget.copied) copied += 1;
    }

    if (Array.isArray(data.downloads)) {
      for (const download of data.downloads) {
        const downloadTarget = copyIfExists(sourceDir, outputDir, download?.file);
        if (downloadTarget) {
          currentTargets.add(downloadTarget.target);
          if (downloadTarget.copied) copied += 1;
        }
      }
    }
  }

  let removed = 0;
  for (const target of previousManifest.copiedFiles) {
    if (currentTargets.has(target)) continue;
    if (!target.startsWith(siteRoot)) continue;
    if (removeIfExists(target)) removed += 1;
  }

  writeManifest({ copiedFiles: [...currentTargets].sort() });
  console.log(`Copied ${copied} changed entry media files and removed ${removed} stale files.`);
}

main();
