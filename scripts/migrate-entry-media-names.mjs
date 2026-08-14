import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(projectRoot, "src", "content");

function contentEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const itemPath = path.join(dir, item.name);
    if (item.isDirectory()) entries.push(...contentEntries(itemPath));
    else if (item.name === "index.md") entries.push(itemPath);
  }
  return entries;
}

function parseFrontmatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.startsWith("---\n")) return null;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return { data: yaml.load(raw.slice(4, end)) || {}, raw };
}

function sameFile(left, right) {
  if (!fs.existsSync(left) || !fs.existsSync(right)) return false;
  const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  return hash(left) === hash(right);
}

function replaceField(raw, field, value) {
  return raw.replace(new RegExp(`^${field}:\\s*.*$`, "m"), `${field}: ${value}`);
}

let renamed = 0;
let duplicateNamesRemoved = 0;
let metadataUpdated = 0;

for (const indexFile of contentEntries(contentRoot)) {
  const parsed = parseFrontmatter(indexFile);
  if (!parsed) continue;

  const directory = path.dirname(indexFile);
  const slug = String(parsed.data.slug || path.basename(directory));
  let raw = parsed.raw;

  for (const field of ["cover", "audio", "image"]) {
    const value = parsed.data[field];
    if (typeof value !== "string" || value.startsWith("/") || /^https?:\/\//i.test(value)) continue;
    const source = path.join(directory, value);
    const extension = path.extname(value);
    const genericBase = path.basename(value, extension).toLowerCase();
    if (!fs.existsSync(source) || !["cover", "audio", "image"].includes(genericBase)) continue;

    let targetExtension = extension === "." ? "" : extension;
    if (!targetExtension) {
      const jpgCandidate = path.join(directory, `${genericBase}.jpg`);
      if (sameFile(source, jpgCandidate)) {
        fs.rmSync(source);
        duplicateNamesRemoved += 1;
        continue;
      }
      targetExtension = ".jpg";
    }

    const targetName = `${slug}${targetExtension}`;
    const target = path.join(directory, targetName);
    if (source !== target) {
      if (fs.existsSync(target)) {
        if (!sameFile(source, target)) throw new Error(`Cannot rename ${source}: target exists with different contents`);
        fs.rmSync(source);
        duplicateNamesRemoved += 1;
      } else {
        fs.renameSync(source, target);
        renamed += 1;
      }
    }
    if (value !== targetName) {
      raw = replaceField(raw, field, targetName);
      metadataUpdated += 1;
    }
  }

  const extensionlessTarget = path.join(directory, `${slug}.`);
  const jpgTarget = path.join(directory, `${slug}.jpg`);
  if (fs.existsSync(extensionlessTarget)) {
    if (fs.existsSync(jpgTarget)) {
      if (!sameFile(extensionlessTarget, jpgTarget)) throw new Error(`Cannot remove ${extensionlessTarget}: target exists with different contents`);
      fs.rmSync(extensionlessTarget);
      duplicateNamesRemoved += 1;
    } else {
      fs.renameSync(extensionlessTarget, jpgTarget);
      renamed += 1;
    }
  }
  if (parsed.data.cover === `${slug}.`) {
    raw = replaceField(raw, "cover", `${slug}.jpg`);
    metadataUpdated += 1;
  }

  for (const fileName of fs.readdirSync(directory)) {
    const match = /^(cover|audio|image)(\.[^.]+)?$/i.exec(fileName);
    if (!match) continue;
    const source = path.join(directory, fileName);
    const targetName = `${slug}${match[2] || ".jpg"}`;
    const target = path.join(directory, targetName);
    if (source === target) continue;
    if (fs.existsSync(target)) {
      if (!sameFile(source, target)) throw new Error(`Cannot remove ${source}: target exists with different contents`);
      fs.rmSync(source);
      duplicateNamesRemoved += 1;
    }
  }

  if (raw !== parsed.raw) fs.writeFileSync(indexFile, raw);
}

console.log(`Renamed ${renamed} entry media files, removed ${duplicateNamesRemoved} duplicate generic names, and updated ${metadataUpdated} frontmatter fields.`);
