import fs from "node:fs";
import path from "node:path";
import { stripBibleVersionTag, stripBibleVersionTagsFromText } from "./lib/sermon-markdown.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sermonsRoot = path.join(projectRoot, "src", "content", "sermons");

function rewriteFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let next = raw;

  next = next.replace(/^scripture:\s*"(.+)"$/mu, (_, value) => `scripture: "${stripBibleVersionTag(value)}"`);
  next = stripBibleVersionTagsFromText(next);

  if (next === raw) {
    return false;
  }

  fs.writeFileSync(filePath, next);
  return true;
}

function main() {
  const files = fs.readdirSync(sermonsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sermonsRoot, entry.name, "index.md"))
    .filter((file) => fs.existsSync(file));

  let changed = 0;
  for (const file of files) {
    if (rewriteFile(file)) {
      changed += 1;
      console.log(`Updated ${path.relative(projectRoot, file)}`);
    }
  }

  console.log(`Processed ${files.length} sermon files, updated ${changed}.`);
}

main();
