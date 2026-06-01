import fs from "node:fs";
import path from "node:path";
import { normalizeSermonBody } from "./lib/sermon-markdown.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sermonsRoot = path.join(projectRoot, "src", "content", "sermons");

function splitFrontmatter(raw) {
  const match = raw.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) {
    return { frontmatter: "", body: raw };
  }
  return {
    frontmatter: match[0],
    body: raw.slice(match[0].length)
  };
}

function readSummary(frontmatter) {
  const match = frontmatter.match(/^summary:\s+(.+)$/m);
  if (!match) return "";
  const value = match[1].trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/\\"/g, "\"");
  }
  return value;
}

function normalizeSummary(summary) {
  return summary
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let rewritten = 0;

for (const entry of fs.readdirSync(sermonsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(sermonsRoot, entry.name, "index.md");
  if (!fs.existsSync(file)) continue;

  const raw = fs.readFileSync(file, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const summary = readSummary(frontmatter);
  const normalizedSummary = normalizeSummary(summary);
  const nextBody = normalizeSermonBody(body, summary);
  const nextFrontmatter = normalizedSummary && normalizedSummary !== summary
    ? frontmatter.replace(/^summary:\s+(.+)$/m, `summary: ${JSON.stringify(normalizedSummary)}`)
    : frontmatter;

  if ((nextBody && nextBody.trim() !== body.trim()) || nextFrontmatter !== frontmatter) {
    fs.writeFileSync(file, `${nextFrontmatter}${nextBody || body.trim()}\n`);
    rewritten += 1;
  }
}

console.log(`Rewrote ${rewritten} sermon files to Markdown.`);
