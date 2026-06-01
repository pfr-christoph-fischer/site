import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sermonsRoot = path.join(projectRoot, "src", "content", "sermons");

let fixed = 0;

for (const entry of fs.readdirSync(sermonsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const dir = path.join(sermonsRoot, entry.name);
  const oldCover = path.join(dir, "cover.");
  const indexFile = path.join(dir, "index.md");

  if (!fs.existsSync(oldCover) || !fs.existsSync(indexFile)) continue;

  const nextCover = path.join(dir, "cover.jpg");
  fs.renameSync(oldCover, nextCover);

  const raw = fs.readFileSync(indexFile, "utf8");
  fs.writeFileSync(indexFile, raw.replace(/^cover:\s+cover\.$/m, "cover: cover.jpg"));
  fixed += 1;
}

console.log(`Fixed ${fixed} sermon cover filenames.`);
