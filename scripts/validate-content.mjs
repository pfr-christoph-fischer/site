import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { detectSchemaType, schemas } from "./lib/content-schemas.mjs";
import { projectRoot, siteRoot } from "./lib/paths.mjs";

const contentRoot = path.join(projectRoot, "src", "content");
const validateBuiltSite = process.argv.includes("--site");

function getFiles(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...getFiles(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.startsWith("---\n")) return null;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return yaml.load(raw.slice(4, end));
}

function validateSourceContent(errors) {
  const files = getFiles(contentRoot, (file) => /\.(md|njk)$/.test(file));
  const explicitPermalinks = new Map();
  const sourceIds = new Map();

  for (const file of files) {
    const data = parseFrontmatter(file);
    if (!data || typeof data !== "object") continue;

    const isFeedTemplate = /feed\.(xml|json)\.njk$/.test(file);
    const isPaginationTemplate = !!data.pagination;
    const isCollectionLandingPage = /\/src\/content\/[^/]+\/index\.njk$/.test(file.replace(/\\/g, "/"));

    if (!data.title && !file.includes("/predigt/") && !isFeedTemplate && !isPaginationTemplate) {
      errors.push(`${file}: missing title`);
    }

    const needsSummary = /\/(sermons|posts|materials|projects|galleries|podcasts)\//.test(file);
    if (needsSummary && !data.summary && !isPaginationTemplate && !isFeedTemplate) {
      errors.push(`${file}: missing summary`);
    }

    const schemaType = detectSchemaType(file);
    if (schemaType && !isPaginationTemplate && !isFeedTemplate && !isCollectionLandingPage && schemas[schemaType]) {
      schemas[schemaType](file, data, errors);
    }

    if (data.permalink) {
      if (explicitPermalinks.has(data.permalink)) {
        errors.push(`${file}: duplicate permalink ${data.permalink} also used by ${explicitPermalinks.get(data.permalink)}`);
      } else {
        explicitPermalinks.set(data.permalink, file);
      }
    }

    if (data.date && Number.isNaN(new Date(data.date).getTime())) {
      errors.push(`${file}: invalid date ${data.date}`);
    }

    if (data.source_id) {
      if (sourceIds.has(data.source_id)) {
        errors.push(`${file}: duplicate source_id ${data.source_id} also used by ${sourceIds.get(data.source_id)}`);
      } else {
        sourceIds.set(data.source_id, file);
      }
    }

    if (data.cover) {
      const coverPath = path.join(path.dirname(file), data.cover);
      if (!fs.existsSync(coverPath)) {
        errors.push(`${file}: missing cover asset ${data.cover}`);
      }
      if (!data.cover_alt) {
        errors.push(`${file}: missing cover_alt for cover ${data.cover}`);
      }
    }

    if (data.audio) {
      const audioPath = path.join(path.dirname(file), data.audio);
      if (!fs.existsSync(audioPath)) {
        errors.push(`${file}: missing audio asset ${data.audio}`);
      }
    }

    if (Array.isArray(data.downloads)) {
      for (const download of data.downloads) {
        if (!download?.file) {
          errors.push(`${file}: download entry missing file`);
          continue;
        }
        if (!download.file.startsWith("/") && !fs.existsSync(path.join(path.dirname(file), download.file))) {
          errors.push(`${file}: missing download file ${download.file}`);
        }
      }
    }

    if (Array.isArray(data.images)) {
      for (const image of data.images) {
        if (!image?.file) {
          errors.push(`${file}: gallery image entry missing file`);
          continue;
        }
        if (!image.alt) {
          errors.push(`${file}: gallery image ${image.file} missing alt text`);
        }
        if (!image.file.startsWith("/") && !fs.existsSync(path.join(path.dirname(file), image.file))) {
          errors.push(`${file}: missing gallery image ${image.file}`);
        }
      }
    }
  }

  return files.length;
}

function normalizeBuiltPath(urlPath) {
  let pathname = String(urlPath || "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .split("#")[0]
    .split("?")[0];
  if (!pathname || pathname.startsWith("http://") || pathname.startsWith("https://") || pathname.startsWith("mailto:") || pathname.startsWith("tel:")) {
    return null;
  }
  if (pathname.startsWith("//")) return null;
  pathname = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  if (!pathname) {
    return path.join(siteRoot, "index.html");
  }
  const directPath = path.join(siteRoot, pathname);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }
  return path.join(siteRoot, pathname, "index.html");
}

function normalizeRelativeBuiltPath(currentFile, target) {
  if (target.startsWith("/")) {
    return normalizeBuiltPath(target);
  }
  const currentDir = path.dirname(currentFile);
  return path.resolve(currentDir, target.split("#")[0].split("?")[0]);
}

function isSkippableBuiltReference(target) {
  return /^(?:[a-z]+:)?\/\//i.test(target) || /^(mailto|tel|data):/i.test(target);
}

function validateBuiltOutput(errors) {
  const htmlFiles = getFiles(siteRoot, (file) => file.endsWith(".html"));
  const canonicals = new Map();

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const normalizedFile = file.replace(/\\/g, "/");
    const isAliasRedirect = normalizedFile.includes("/predigt/");
    const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/i);
    if (!canonicalMatch) {
      errors.push(`${file}: missing canonical link`);
    } else if (!isAliasRedirect && canonicals.has(canonicalMatch[1])) {
      errors.push(`${file}: duplicate canonical ${canonicalMatch[1]} also used by ${canonicals.get(canonicalMatch[1])}`);
    } else if (!isAliasRedirect) {
      canonicals.set(canonicalMatch[1], file);
    }

    for (const match of html.matchAll(/<(a|img|script|source)\b[^>]+(?:href|src)="([^"]+)"/gi)) {
      const target = match[2];
      if (isSkippableBuiltReference(target)) {
        continue;
      }
      if (target === "/pagefind/pagefind-ui.js" || target.startsWith("/pagefind/")) {
        continue;
      }
      const builtTarget = target.startsWith("/") ? normalizeBuiltPath(target) : normalizeRelativeBuiltPath(file, target);
      if (!builtTarget) continue;
      if (!fs.existsSync(builtTarget)) {
        errors.push(`${file}: broken internal reference ${target}`);
      }
    }
  }

  const podcastFeed = path.join(siteRoot, "podcast.xml");
  if (fs.existsSync(podcastFeed)) {
    const xml = fs.readFileSync(podcastFeed, "utf8");
    for (const match of xml.matchAll(/<enclosure[^>]+url="([^"]+)"/g)) {
      const builtTarget = normalizeBuiltPath(new URL(match[1]).pathname);
      if (builtTarget && !fs.existsSync(builtTarget)) {
        errors.push(`${podcastFeed}: enclosure points to missing file ${match[1]}`);
      }
    }
  }

  return htmlFiles.length;
}

function main() {
  const errors = [];
  const contentCount = validateSourceContent(errors);
  const builtCount = validateBuiltSite ? validateBuiltOutput(errors) : 0;

  if (errors.length) {
    console.error("Content validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const suffix = validateBuiltSite ? ` and ${builtCount} generated pages` : "";
  console.log(`Validated ${contentCount} content files${suffix} with no blocking errors.`);
}

main();
