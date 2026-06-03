import fs from "node:fs";
import matter from "gray-matter";

const frontmatterCache = new Map();

function normalizeTags(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? [value]
      : [];

  const tags = [];
  const seen = new Set();

  for (const tag of raw) {
    const normalized = String(tag || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
}

export function readFrontmatter(filePath) {
  if (!filePath) return {};
  if (frontmatterCache.has(filePath)) return frontmatterCache.get(filePath);
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
  frontmatterCache.set(filePath, data);
  return data;
}

export function readFrontmatterTags(filePath) {
  return normalizeTags(readFrontmatter(filePath).tags);
}
