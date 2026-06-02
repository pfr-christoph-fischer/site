import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
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

function copyIfExists(sourceDir, outputDir, relativePath) {
  if (!relativePath || typeof relativePath !== "string" || relativePath.startsWith("/")) return false;
  const source = path.join(sourceDir, relativePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return false;
  const target = path.join(outputDir, relativePath);
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
  return true;
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
  let copied = 0;

  for (const indexFile of contentIndexes) {
    const data = parseFrontmatter(indexFile);
    if (!data) continue;

    const sourceDir = path.dirname(indexFile);
    const outputDir = getOutputDir(indexFile, data);

    if (!outputDir || !fs.existsSync(outputDir)) continue;

    if (copyIfExists(sourceDir, outputDir, data.cover)) copied += 1;
    if (copyIfExists(sourceDir, outputDir, data.audio)) copied += 1;

    if (Array.isArray(data.downloads)) {
      for (const download of data.downloads) {
        if (copyIfExists(sourceDir, outputDir, download?.file)) copied += 1;
      }
    }
  }

  console.log(`Copied ${copied} entry media files into generated content directories.`);
}

main();
