import fs from "node:fs";
import path from "node:path";
import {
  normalizeSermonBody,
  stripBibleVersionTag,
  stripBibleVersionTagsFromText,
  textExcerpt
} from "./lib/sermon-markdown.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const configPath = path.join(repoRoot, "current", "config", "pfarrplaner.json");
const sermonsRoot = path.join(repoRoot, "2026", "src", "content", "sermons");

function parseArgs(argv) {
  const out = { audio: null, image: null, hidden: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--audio") {
      out.audio = argv[i + 1] || null;
      i += 1;
    } else if (argv[i] === "--image") {
      out.image = argv[i + 1] || null;
      i += 1;
    } else if (argv[i] === "--hidden") {
      out.hidden = true;
    }
  }
  return out;
}

function slugify(input) {
  return String(input)
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (/^[a-zA-Z0-9 _.,/()+-]+$/.test(value) && !String(value).includes("\n")) {
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

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }
  return response.json();
}

async function downloadFile(url, targetPath, token) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) return false;
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(targetPath, bytes);
  return true;
}

function findExistingBySourceId(sourceId) {
  for (const entry of fs.readdirSync(sermonsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(sermonsRoot, entry.name, "index.md");
    if (!fs.existsSync(indexPath)) continue;
    const raw = fs.readFileSync(indexPath, "utf8");
    if (raw.includes(`source_id: ${sourceId}`) || raw.includes(`source_id: "${sourceId}"`)) {
      return indexPath;
    }
  }
  return null;
}

function resolveOccasion(events) {
  for (const event of events || []) {
    if (Array.isArray(event.liturgy)) continue;
    if (event.liturgy?.Bezeichnung) return event.liturgy.Bezeichnung;
    if (event.liturgy?.title) return event.liturgy.title;
  }
  return null;
}

function resolveSubtitle(sermon) {
  const candidates = [sermon.subtitle, sermon.subTitle, sermon.alternativeHeadline];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function resolveLiturgyColor(liturgy) {
  if (!liturgy || Array.isArray(liturgy)) return null;
  return liturgy["CSS-Farbe"] || liturgy.litColor || liturgy.Farbe || null;
}

function resolvePrimaryLiturgyColor(events) {
  for (const event of events || []) {
    const color = resolveLiturgyColor(event.liturgy);
    if (color) return color;
  }
  return null;
}

async function main() {
  const overrides = parseArgs(process.argv.slice(2));
  const hosts = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const host = hosts[0];
  const latest = await fetchJson(`https://${host.host}/extranet/user/sermons/latest`, host.token);
  const sermonsPayload = latest.sermons || latest.data || [];
  const sermons = Array.isArray(sermonsPayload) ? sermonsPayload : Object.values(sermonsPayload);
  if (!Array.isArray(sermons) || sermons.length === 0) {
    throw new Error("No sermons returned by Pfarrplaner");
  }

  const sermonHeader = sermons[0];
  const sermonId = sermonHeader.id;
  const sermon = await fetchJson(`https://${host.host}/extranet/sermon/${sermonId}`, host.token);
  const date = new Date(sermon.events?.[0]?.date || sermon.date || Date.now()).toISOString().slice(0, 10);
  const slug = sermon.slug || slugify(sermon.title || `sermon-${sermonId}`);
  const sourceId = `${sermon.id}@${host.host}`;
  const targetDir = path.join(sermonsRoot, `${date}-${slug}`);

  const existingBySourceId = findExistingBySourceId(sourceId);
  if (existingBySourceId) {
    console.log(`Skipping existing source_id: ${existingBySourceId}`);
    return;
  }

  if (fs.existsSync(targetDir)) {
    console.log(`Skipping existing sermon: ${targetDir}`);
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  let coverFile = null;
  let audioFile = null;
  const sanitizedReference = stripBibleVersionTag(sermon.reference || null);
  const sanitizedSummary = stripBibleVersionTagsFromText(sermon.summary || "") || "";
  const sanitizedText = stripBibleVersionTagsFromText(sermon.text || "") || "";

  if (overrides.image) {
    const ext = path.extname(overrides.image) || ".jpg";
    coverFile = `cover${ext}`;
    fs.copyFileSync(path.resolve(overrides.image), path.join(targetDir, coverFile));
  } else if (sermon.image && String(sermon.image).startsWith("attachments/")) {
    const imageUrl = `https://${host.host}/image/${String(sermon.image).replace("attachments/", "")}`;
    const ext = path.extname(sermon.image) || ".jpg";
    coverFile = `cover${ext}`;
    await downloadFile(imageUrl, path.join(targetDir, coverFile), host.token);
  }

  if (overrides.audio) {
    const ext = path.extname(overrides.audio) || ".mp3";
    audioFile = `audio${ext}`;
    fs.copyFileSync(path.resolve(overrides.audio), path.join(targetDir, audioFile));
  } else if (sermon.audio_recording) {
    const audioUrl = String(sermon.audio_recording).startsWith("http")
      ? sermon.audio_recording
      : `https://www.christoph-fischer.de${sermon.audio_recording}`;
    const ext = path.extname(audioUrl) || ".mp3";
    audioFile = `audio${ext}`;
    await downloadFile(audioUrl, path.join(targetDir, audioFile));
  }

  const frontmatter = renderFrontmatter({
    title: sermon.title,
    subtitle: resolveSubtitle(sermon),
    date,
    slug,
    scripture: sanitizedReference,
    occasion: sermon.occasion || resolveOccasion(sermon.events || []),
    liturgy_color: resolvePrimaryLiturgyColor(sermon.events || []),
    series: sermon.series || null,
    summary: sanitizedSummary || textExcerpt(sanitizedText),
    source: "pfarrplaner",
    source_id: sourceId,
    cover: coverFile,
    cover_alt: coverFile ? `Titelbild zur Predigt "${sermon.title}".` : null,
    audio: audioFile,
    audio_duration: sermon.audio_duration || null,
    listed: overrides.hidden ? false : true,
    index: overrides.hidden ? false : true,
    federate: overrides.hidden ? false : true,
    events: (sermon.events || []).map((event) => ({
      date: event.date || null,
      time: event.time || null,
      title: event.title || null,
      location: event.location || null,
      occasion: Array.isArray(event.liturgy) ? null : event.liturgy?.Bezeichnung || event.liturgy?.title || null,
      liturgy_color: resolveLiturgyColor(event.liturgy)
    }))
  });

  const body = sanitizedText
    ? `${normalizeSermonBody(sanitizedText, sanitizedSummary)}\n`
    : `${sanitizedSummary}\n`;

  fs.writeFileSync(path.join(targetDir, "index.md"), `${frontmatter}${body}`);
  console.log(`Imported latest sermon to ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
