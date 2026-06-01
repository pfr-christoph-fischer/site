import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const generatedRoot = path.join(projectRoot, "src", "assets", "generated");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">Christoph Fischer</title>
  <desc id="desc">Predigten, Texte, Materialien und digitale Projekte.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6f2eb"/>
      <stop offset="100%" stop-color="#e0d4bf"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="72" y="72" width="1056" height="486" rx="28" fill="#fffaf2" stroke="#c2ab81" stroke-width="3"/>
  <text x="104" y="240" font-family="Georgia, serif" font-size="76" fill="#2b241d">Christoph Fischer</text>
  <text x="104" y="324" font-family="Arial, sans-serif" font-size="34" fill="#4f4336">Predigten, Texte, Materialien</text>
  <text x="104" y="372" font-family="Arial, sans-serif" font-size="34" fill="#4f4336">und digitale Projekte</text>
  <text x="104" y="504" font-family="Arial, sans-serif" font-size="26" fill="#6c5b45">www.christoph-fischer.de</text>
</svg>
`.trim();

async function main() {
  ensureDir(generatedRoot);
  writeFile(path.join(projectRoot, "src", "icon.svg"), svg);
  writeFile(path.join(generatedRoot, "social-default.svg"), svg);

  const image = sharp(Buffer.from(svg));
  await image.png().toFile(path.join(generatedRoot, "social-default.png"));
  await image.resize(180, 180).png().toFile(path.join(generatedRoot, "apple-touch-icon.png"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
