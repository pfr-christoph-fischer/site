import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sermonsRoot = path.join(projectRoot, "src", "content", "sermons");

function parseArgs(argv) {
  const out = { slug: null, sourceId: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--slug") {
      out.slug = argv[i + 1] || null;
      i += 1;
    } else if (argv[i] === "--source-id") {
      out.sourceId = argv[i + 1] || null;
      i += 1;
    }
  }
  return out;
}

function sermonMatches(raw, filePath, options) {
  if (options.slug) {
    const dirName = path.basename(path.dirname(filePath));
    if (dirName.endsWith(`-${options.slug}`) || raw.includes(`slug: ${options.slug}`) || raw.includes(`slug: "${options.slug}"`)) {
      return true;
    }
  }
  if (options.sourceId && (raw.includes(`source_id: ${options.sourceId}`) || raw.includes(`source_id: "${options.sourceId}"`))) {
    return true;
  }
  return false;
}

function setBooleanField(raw, field, value) {
  const pattern = new RegExp(`^${field}:\\s+.*$`, "m");
  const replacement = `${field}: ${value ? "true" : "false"}`;
  if (pattern.test(raw)) {
    return raw.replace(pattern, replacement);
  }
  const marker = "\n---\n";
  const end = raw.indexOf(marker);
  if (end === -1) {
    throw new Error("Invalid frontmatter");
  }
  return `${raw.slice(0, end)}\n${replacement}${raw.slice(end)}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.slug && !options.sourceId) {
    console.error("Usage: npm run release:sermon -- --slug <slug> [--source-id <id>]");
    process.exit(1);
  }

  const files = fs.readdirSync(sermonsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sermonsRoot, entry.name, "index.md"))
    .filter((file) => fs.existsSync(file));

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    if (!sermonMatches(raw, file, options)) {
      continue;
    }

    let next = raw;
    next = setBooleanField(next, "listed", true);
    next = setBooleanField(next, "index", true);
    next = setBooleanField(next, "federate", true);
    fs.writeFileSync(file, next);
    console.log(`Released sermon: ${file}`);
    return;
  }

  console.error("No sermon matched the provided selectors.");
  process.exit(1);
}

main();
