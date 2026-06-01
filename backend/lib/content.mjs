import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const sermonsRoot = path.join(config.projectRoot, "src", "content", "sermons");

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed.replace(/^'|'$/g, "\""));
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseFrontmatter(fileContent) {
  if (!fileContent.startsWith("---")) return {};
  const end = fileContent.indexOf("\n---", 3);
  if (end === -1) return {};
  const raw = fileContent.slice(4, end).split("\n");
  const data = {};
  let currentArray = null;
  let currentObject = null;

  for (const line of raw) {
    if (!line.trim()) continue;
    if (line.startsWith("  -")) {
      if (!currentArray) continue;
      const rest = line.slice(4).trim();
      if (!rest) {
        currentObject = {};
        currentArray.push(currentObject);
      } else if (rest.includes(":")) {
        currentObject = {};
        currentArray.push(currentObject);
        const [key, ...parts] = rest.split(":");
        currentObject[key.trim()] = parseScalar(parts.join(":"));
      } else {
        currentArray.push(parseScalar(rest));
        currentObject = null;
      }
      continue;
    }
    if (line.startsWith("      ") && currentObject && line.includes(":")) {
      const [key, ...parts] = line.trim().split(":");
      currentObject[key.trim()] = parseScalar(parts.join(":"));
      continue;
    }
    currentArray = null;
    currentObject = null;
    const [key, ...parts] = line.split(":");
    const rawValue = parts.join(":").trim();
    if (!rawValue) {
      data[key.trim()] = [];
      currentArray = data[key.trim()];
    } else {
      data[key.trim()] = parseScalar(rawValue);
    }
  }

  return data;
}

function listSermonFiles() {
  if (!fs.existsSync(sermonsRoot)) return [];
  return fs.readdirSync(sermonsRoot)
    .map((entry) => path.join(sermonsRoot, entry, "index.md"))
    .filter((file) => fs.existsSync(file));
}

export function getPublishedSermons() {
  return listSermonFiles()
    .map((file) => {
      const content = fs.readFileSync(file, "utf8");
      const frontmatter = parseFrontmatter(content);
      const excerpt = content.replace(/^---[\s\S]*?---\n?/, "").replace(/<[^>]+>/g, "").trim();
      const date = String(frontmatter.date || "1970-01-01");
      const year = date.slice(0, 4);
      const slug = String(frontmatter.slug || path.basename(path.dirname(file)).replace(/^\d{4}-\d{2}-\d{2}-/, ""));
      const url = `${config.baseUrl}/predigten/${year}/${slug}/`;
      return {
        ...frontmatter,
        slug,
        date,
        url,
        summary: frontmatter.summary || excerpt.slice(0, 240),
        excerpt: excerpt.slice(0, 500),
        file
      };
    })
    .filter((item) => item.title && item.date)
    .filter((item) => item.listed !== false && item.index !== false && item.federate !== false)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
