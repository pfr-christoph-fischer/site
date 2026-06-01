import fs from "node:fs";
import path from "node:path";
import { normalizeSermonBody, textExcerpt } from "./lib/sermon-markdown.mjs";
import { subtle } from "node:crypto";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const sqlPath = path.join(repoRoot, "cfde.sql");
const legacyRoot = path.join(repoRoot, "current");
const targetRoot = path.join(repoRoot, "2026");
const sermonsRoot = path.join(targetRoot, "src", "content", "sermons");

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseSqlString(input, start) {
  let i = start + 1;
  let out = "";

  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\") {
      const next = input[i + 1];
      if (next === undefined) {
        i += 1;
        continue;
      }
      switch (next) {
        case "n":
          out += "\n";
          break;
        case "r":
          out += "\r";
          break;
        case "t":
          out += "\t";
          break;
        case "0":
          out += "\0";
          break;
        case "Z":
          out += "\x1A";
          break;
        default:
          out += next;
          break;
      }
      i += 2;
      continue;
    }
    if (ch === "'" && input[i + 1] === "'") {
      out += "'";
      i += 2;
      continue;
    }
    if (ch === "'") {
      return { value: out, next: i + 1 };
    }
    out += ch;
    i += 1;
  }

  throw new Error("Unterminated SQL string");
}

function parseValue(input, start) {
  if (input[start] === "'") {
    return parseSqlString(input, start);
  }

  let i = start;
  while (i < input.length && input[i] !== "," && input[i] !== ")") {
    i += 1;
  }
  const raw = input.slice(start, i).trim();

  if (raw === "NULL") {
    return { value: null, next: i };
  }

  if (/^-?\d+$/.test(raw)) {
    return { value: Number(raw), next: i };
  }

  return { value: raw, next: i };
}

function parseInsertRows(sql, tableName) {
  const rows = [];
  const marker = `INSERT INTO \`${tableName}\` VALUES `;
  let searchFrom = 0;

  while (searchFrom < sql.length) {
    const start = sql.indexOf(marker, searchFrom);
    if (start === -1) {
      break;
    }

    const from = start + marker.length;
    let end = -1;
    let inString = false;
    for (let i = from; i < sql.length; i += 1) {
      const ch = sql[i];
      if (ch === "\\" && inString) {
        i += 1;
        continue;
      }
      if (ch === "'") {
        inString = !inString;
        continue;
      }
      if (ch === ";" && !inString) {
        end = i;
        break;
      }
    }
    if (end === -1) {
      throw new Error(`INSERT terminator not found for table ${tableName}`);
    }

    const block = sql.slice(from, end);
    let i = 0;
    while (i < block.length) {
      const ch = block[i];
      if (ch === "(") {
        i += 1;
        const row = [];
        while (i < block.length) {
          const parsed = parseValue(block, i);
          row.push(parsed.value);
          i = parsed.next;
          if (block[i] === ",") {
            i += 1;
            continue;
          }
          if (block[i] === ")") {
            i += 1;
            break;
          }
        }
        rows.push(row);
      } else {
        i += 1;
      }
    }

    searchFrom = end + 1;
  }

  return rows;
}

function asSermonRow(row) {
  return {
    id: Number(row[0]),
    slug: String(row[1] ?? ""),
    date: row[2],
    data: row[3],
    created_at: row[4],
    updated_at: row[5],
    private: Number(row[6] ?? 0),
    title: row[7],
    subtitle: row[8],
    reference: row[9],
    image: row[10],
    summary: row[11],
    audio_recording: row[12],
    text: row[13],
    events: row[14],
    audio_duration: row[15],
    source_id: row[16]
  };
}

function formatDate(dateInput) {
  if (!dateInput) return null;
  const date = new Date(String(dateInput).replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function slugify(input) {
  return input
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

function findLegacyAsset(relativePath) {
  if (!relativePath) return null;
  const clean = String(relativePath).replace(/^\/+/, "");
  const candidate = path.join(legacyRoot, "public", clean);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

function findLegacyImageByUrl(imageUrl) {
  if (!imageUrl) return null;
  const parsed = String(imageUrl).match(/\/images\/sermons\/([^/?#]+)$/);
  if (!parsed) return null;
  const basename = parsed[1];
  const sermonsDir = path.join(legacyRoot, "public", "images", "sermons");
  if (!fs.existsSync(sermonsDir)) return null;

  const exact = path.join(sermonsDir, basename);
  if (fs.existsSync(exact)) {
    return exact;
  }

  const baseNameWithoutTrailingDot = basename.replace(/\.$/, "");
  const candidates = fs.readdirSync(sermonsDir).filter((entry) => {
    return (
      entry === basename ||
      entry === `${baseNameWithoutTrailingDot}.jpg` ||
      entry === `${baseNameWithoutTrailingDot}.jpeg` ||
      entry === `${baseNameWithoutTrailingDot}.png` ||
      entry.startsWith(`${baseNameWithoutTrailingDot}.`)
    );
  });

  if (candidates.length === 0) return null;
  return path.join(sermonsDir, candidates.sort()[0]);
}

function copyAssetIfPresent(sourceFile, targetDir, preferredName) {
  if (!sourceFile || !fs.existsSync(sourceFile)) return null;
  const inferredExt = preferredName === "cover" && !path.extname(sourceFile) ? ".jpg" : "";
  const ext = path.extname(sourceFile) || inferredExt;
  const fileName = preferredName ? `${preferredName}${ext}` : path.basename(sourceFile);
  const targetFile = path.join(targetDir, fileName);
  fs.copyFileSync(sourceFile, targetFile);
  return fileName;
}

function sanitizeHtml(html) {
  return String(html)
    .replace(/\r\n/g, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();
}

function yamlScalar(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (value === "") return "\"\"";
  if (/^[a-zA-Z0-9 _.,/()+-]+$/.test(value) && !value.includes("\n")) {
    return value;
  }
  return JSON.stringify(value);
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
    if (typeof value === "object") {
      lines.push(`${key}:`);
      for (const [childKey, childValue] of Object.entries(value)) {
        if (childValue === undefined || childValue === null || childValue === "") continue;
        lines.push(`  ${childKey}: ${yamlScalar(childValue)}`);
      }
      continue;
    }
    lines.push(`${key}: ${yamlScalar(value)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function eventOccasion(events) {
  for (const event of events) {
    const liturgy = event.liturgy;
    if (Array.isArray(liturgy)) continue;
    if (liturgy?.Bezeichnung) return String(liturgy.Bezeichnung);
    if (liturgy?.title) return String(liturgy.title);
  }
  return null;
}

function isPublicSermon(row, data) {
  if (row.private === 1) return false;
  if (data.isPrivate === true) return false;
  return true;
}

function migrateSermon(row) {
  const data = row.data ? JSON.parse(row.data) : {};
  if (!isPublicSermon(row, data)) {
    return false;
  }

  const isoDate = formatDate(row.date) ?? formatDate(row.created_at) ?? "undated";
  const finalSlug = row.slug || slugify(data.title || row.title || `sermon-${row.id}`);
  const dirName = `${isoDate}-${finalSlug}`;
  const targetDir = path.join(sermonsRoot, dirName);
  ensureDir(targetDir);

  const legacyEvents = (() => {
    if (Array.isArray(data.events)) return data.events;
    if (row.events) {
      try {
        return JSON.parse(row.events);
      } catch {
        return [];
      }
    }
    return [];
  })();

  const imageSource = findLegacyImageByUrl(row.image || data.image || null);
  const audioSource = findLegacyAsset(row.audio_recording || data.audio_recording || null);
  const coverFile = copyAssetIfPresent(imageSource, targetDir, "cover");
  const audioFile = copyAssetIfPresent(audioSource, targetDir, "audio");

  const summary = data.summary || row.summary || textExcerpt(data.text || row.text || "");
  const note = typeof data.note === "string" ? data.note : null;
  const finalNote = typeof data.finalNote === "string" ? data.finalNote : null;
  const transcript = typeof data.transcript === "string" ? data.transcript : null;
  const title = data.title || row.title || finalSlug;
  const subtitle = data.subtitle || row.subtitle || "";
  const textHtml = data.text || row.text || "";

  const frontmatter = renderFrontmatter({
    title,
    subtitle: subtitle || null,
    date: isoDate,
    updated: formatDate(row.updated_at),
    slug: finalSlug,
    scripture: data.reference || data.scripture || row.reference || null,
    occasion: data.occasion || eventOccasion(legacyEvents),
    series: data.series || null,
    summary,
    source: "pfarrplaner",
    source_id: row.source_id || null,
    cover: coverFile,
    cover_alt: `Titelbild zur Predigt "${title}".`,
    audio: audioFile,
    audio_duration: row.audio_duration || data.audio_duration || null,
    note,
    final_note: finalNote,
    transcript,
    legacy_id: row.id,
    events: legacyEvents.map((event) => ({
      date: typeof event.date === "string" ? event.date : null,
      time: typeof event.time === "string" ? event.time : null,
      title: typeof event.title === "string" ? event.title : null,
      location: typeof event.location === "string" ? event.location : null,
      occasion: Array.isArray(event.liturgy)
        ? null
        : event.liturgy?.Bezeichnung || event.liturgy?.title || null
    }))
  });

  const bodyParts = [];
  if (note) {
    bodyParts.push(`> ${note}`);
  }
  if (textHtml) {
    bodyParts.push(normalizeSermonBody(sanitizeHtml(textHtml), summary));
  } else if (transcript) {
    bodyParts.push(transcript);
  } else if (summary) {
    bodyParts.push(summary);
  }
  if (finalNote) {
    bodyParts.push(`> ${finalNote}`);
  }

  fs.writeFileSync(path.join(targetDir, "index.md"), `${frontmatter}${bodyParts.join("\n\n").trim()}\n`);
  return true;
}

function main() {
  const sql = readFile(sqlPath);
  const rows = parseInsertRows(sql, "sermons").map(asSermonRow);
  let migrated = 0;
  let publicCandidates = 0;

  for (const row of rows) {
    const data = row.data ? JSON.parse(row.data) : {};
    if (isPublicSermon(row, data)) {
      publicCandidates += 1;
    }
    if (migrateSermon(row)) {
      migrated += 1;
    }
  }

  console.log(`Parsed ${rows.length} sermon rows, found ${publicCandidates} public candidates, migrated ${migrated} sermons into ${sermonsRoot}`);
}

main();
