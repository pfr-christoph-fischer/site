import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { readMp3Duration } from "./lib/audio-metadata.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sermonsRoot = path.join(projectRoot, "src", "content", "sermons");

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run")
  };
}

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

function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.startsWith("---\n")) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error(`Unterminated frontmatter in ${filePath}`);
  }
  return {
    raw,
    data: yaml.load(raw.slice(4, end)),
    body: raw.slice(end + 5)
  };
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (/^[a-zA-Z0-9 _.,/()+:-]+$/.test(value) && !String(value).includes("\n")) {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function renderFrontmatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          lines.push("  -");
          for (const [childKey, childValue] of Object.entries(item)) {
            if (childValue === undefined || childValue === null || childValue === "") continue;
            lines.push(`      ${childKey}: ${yamlScalar(childValue)}`);
          }
        } else {
          lines.push(`  - ${yamlScalar(item)}`);
        }
      }
      continue;
    }
    lines.push(`${key}: ${yamlScalar(value)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function resolveAudioPath(filePath, data) {
  if (!data?.audio || typeof data.audio !== "string") return null;
  if (data.audio.startsWith("/") || /^[a-z]+:\/\//i.test(data.audio)) return null;
  const audioPath = path.join(path.dirname(filePath), data.audio);
  if (!fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile()) return null;
  return audioPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = getFiles(sermonsRoot, (file) => file.endsWith("/index.md") || file.endsWith("\\index.md"));
  let updated = 0;

  for (const file of files) {
    const parsed = parseMarkdownFile(file);
    const data = parsed.data || {};
    if (data.audio_duration) continue;

    const audioPath = resolveAudioPath(file, data);
    if (!audioPath) continue;

    const duration = readMp3Duration(audioPath);
    if (!duration) continue;

    const nextRaw = `${renderFrontmatter({ ...data, audio_duration: duration })}${parsed.body}`;
    if (nextRaw === parsed.raw) continue;

    updated += 1;
    if (options.dryRun) {
      console.log(`Would update ${file} -> ${duration}`);
      continue;
    }

    fs.writeFileSync(file, nextRaw);
    console.log(`Updated ${file} -> ${duration}`);
  }

  if (options.dryRun) {
    console.log(`Dry run complete. ${updated} sermon files would be updated.`);
  } else {
    console.log(`Audio duration sync complete. Updated ${updated} sermon files.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
