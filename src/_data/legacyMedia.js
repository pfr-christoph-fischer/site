import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
const legacyPublic = path.join(repoRoot, "current", "public");
const meRoot = path.join(legacyPublic, "img", "me");

function toPublicUrl(filePath) {
  return filePath.replace(legacyPublic, "").split(path.sep).join("/");
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((entry) => fs.statSync(path.join(dirPath, entry)).isFile() && /\.(png|jpe?g|webp|pdf)$/i.test(entry))
    .sort((a, b) => a.localeCompare(b, "de"));
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((entry) => fs.statSync(path.join(dirPath, entry)).isDirectory())
    .sort((a, b) => a.localeCompare(b, "de"));
}

function parsePressTitle(fileName) {
  const base = fileName.replace(path.extname(fileName), "");
  const dateChunk = base.slice(0, 8);
  const rest = base.slice(8).trim();
  if (!/^\d{8}$/.test(dateChunk)) return base;
  return `${rest}, ${dateChunk.slice(6, 8)}.${dateChunk.slice(4, 6)}.${dateChunk.slice(0, 4)}`;
}

function buildArtProjects() {
  const artRoot = path.join(meRoot, "art");
  return listDirectories(artRoot).map((directoryName) => {
    const dirPath = path.join(artRoot, directoryName);
    return {
      title: directoryName,
      images: listImageFiles(dirPath).map((fileName) => ({
        src: toPublicUrl(path.join(dirPath, fileName)),
        alt: `${directoryName}: ${fileName.replace(path.extname(fileName), "")}`
      }))
    };
  });
}

const officialRoot = path.join(meRoot, "official");
const mePicsRoot = path.join(meRoot, "me-pics");
const pressRoot = path.join(meRoot, "press");
const portraits = listImageFiles(officialRoot);

export default {
  portrait: portraits[0] ? toPublicUrl(path.join(officialRoot, portraits[0])) : null,
  aboutGallery: listImageFiles(mePicsRoot).map((fileName) => ({
    src: toPublicUrl(path.join(mePicsRoot, fileName)),
    alt: `Christoph Fischer: ${fileName.replace(path.extname(fileName), "")}`
  })),
  press: listImageFiles(pressRoot).map((fileName) => ({
    src: toPublicUrl(path.join(pressRoot, fileName)),
    alt: `Presseausschnitt: ${parsePressTitle(fileName)}`,
    title: parsePressTitle(fileName)
  })),
  artProjects: buildArtProjects()
};
