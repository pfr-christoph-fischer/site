import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cacheRoot = path.join(projectRoot, ".cache");
const generatedRoot = path.join(projectRoot, "src", "assets", "generated");
const manifestPath = path.join(cacheRoot, "generated-site-assets.json");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function writeTextIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return false;
  }
  writeFile(filePath, content);
  return true;
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return {};
  }
}

function writeManifest(data) {
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
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
  const svgHash = crypto.createHash("sha256").update(svg).digest("hex");
  const manifest = readManifest();
  const iconSvgPath = path.join(projectRoot, "src", "icon.svg");
  const socialSvgPath = path.join(generatedRoot, "social-default.svg");
  const socialPngPath = path.join(generatedRoot, "social-default.png");
  const appleTouchPath = path.join(generatedRoot, "apple-touch-icon.png");

  const wroteIcon = writeTextIfChanged(iconSvgPath, svg);
  const wroteSocialSvg = writeTextIfChanged(socialSvgPath, svg);
  const rasterOutputsMissing = !fs.existsSync(socialPngPath) || !fs.existsSync(appleTouchPath);
  const rasterOutputsStale = Boolean(manifest.svgHash) && manifest.svgHash !== svgHash;

  if (rasterOutputsMissing || rasterOutputsStale) {
    const svgBuffer = Buffer.from(svg);
    await sharp(svgBuffer).png().toFile(socialPngPath);
    await sharp(svgBuffer).resize(180, 180).png().toFile(appleTouchPath);
  }

  writeManifest({ svgHash });
  const regeneratedRasterCount = rasterOutputsMissing || rasterOutputsStale ? 2 : 0;
  const rewrittenSvgCount = Number(wroteIcon) + Number(wroteSocialSvg);
  console.log(`Generated ${regeneratedRasterCount} raster assets and refreshed ${rewrittenSvgCount} SVG files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
