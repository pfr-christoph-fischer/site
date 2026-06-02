import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const configPath = path.join(repoRoot, "current", "config", "pfarrplaner.json");
const sermonsRoot = path.join(repoRoot, "2026", "src", "content", "sermons");

function parseArgs(argv) {
  const out = { slug: null, sourceId: null, dryRun: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--slug") {
      out.slug = argv[i + 1] || null;
      i += 1;
    } else if (argv[i] === "--source-id") {
      out.sourceId = argv[i + 1] || null;
      i += 1;
    } else if (argv[i] === "--dry-run") {
      out.dryRun = true;
    } else if (argv[i] === "--force") {
      out.force = true;
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

function sermonMatches(filePath, data, options) {
  if (options.slug) {
    const dirName = path.basename(path.dirname(filePath));
    if (dirName.endsWith(`-${options.slug}`) || data.slug === options.slug) {
      return true;
    }
  }
  if (options.sourceId && data.source_id === options.sourceId) {
    return true;
  }
  return !options.slug && !options.sourceId;
}

function resolveSubtitle(sermon) {
  const candidates = [sermon.subtitle, sermon.subTitle, sermon.alternativeHeadline];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function resolveLiturgyLabel(liturgy) {
  if (!liturgy || Array.isArray(liturgy)) return null;
  return liturgy.Bezeichnung || liturgy.title || null;
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const hosts = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const hostMap = new Map(hosts.map((host) => [host.host, host]));

  const files = fs.readdirSync(sermonsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sermonsRoot, entry.name, "index.md"))
    .filter((file) => fs.existsSync(file));

  let updated = 0;

  for (const file of files) {
    const parsed = parseMarkdownFile(file);
    const data = parsed.data || {};
    if (!sermonMatches(file, data, options)) continue;
    if (!data.source_id || typeof data.source_id !== "string") continue;

    const [sermonId, hostName] = data.source_id.split("@");
    const host = hostMap.get(hostName);
    if (!host || !sermonId) continue;

    const sermon = await fetchJson(`https://${host.host}/extranet/sermon/${sermonId}`, host.token);
    const nextData = { ...data };

    const subtitle = resolveSubtitle(sermon);
    const liturgyColor = resolvePrimaryLiturgyColor(sermon.events || []);

    if ((options.force || !nextData.subtitle) && subtitle) {
      nextData.subtitle = subtitle;
    }

    if ((options.force || !nextData.liturgy_color) && liturgyColor) {
      nextData.liturgy_color = liturgyColor;
    }

    if (Array.isArray(sermon.events) && Array.isArray(nextData.events)) {
      nextData.events = nextData.events.map((event, index) => {
        const sourceEvent = sermon.events[index];
        const liturgyColorValue = resolveLiturgyColor(sourceEvent?.liturgy);
        const liturgyLabel = resolveLiturgyLabel(sourceEvent?.liturgy);
        const nextEvent = { ...event };
        if ((options.force || !nextEvent.liturgy_color) && liturgyColorValue) {
          nextEvent.liturgy_color = liturgyColorValue;
        }
        if ((options.force || !nextEvent.occasion) && liturgyLabel) {
          nextEvent.occasion = liturgyLabel;
        }
        return nextEvent;
      });
    }

    const nextRaw = `${renderFrontmatter(nextData)}${parsed.body}`;
    if (nextRaw === parsed.raw) continue;

    updated += 1;
    if (options.dryRun) {
      console.log(`Would update ${file}`);
      continue;
    }

    fs.writeFileSync(file, nextRaw);
    console.log(`Updated ${file}`);
  }

  if (options.dryRun) {
    console.log(`Dry run complete. ${updated} sermon files would be updated.`);
  } else {
    console.log(`Metadata sync complete. Updated ${updated} sermon files.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
