import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Image from "@11ty/eleventy-img";
import { DateTime } from "luxon";
import { copyEntryMedia } from "./scripts/copy-sermon-assets.mjs";
import { readAudioFileSize, readMp3Duration } from "./scripts/lib/audio-metadata.mjs";
import { loadEnv } from "./scripts/lib/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;
loadEnv(projectRoot);

function slugify(input) {
  return String(input || "")
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortedItems(items = []) {
  return [...items].sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
}

function uniqueValues(items, extractor) {
  const map = new Map();
  for (const item of items) {
    const values = extractor(item) || [];
    for (const value of values) {
      if (!value) continue;
      const key = String(value).trim();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    }
  }
  const usedSlugs = new Map();
  return [...map.entries()]
    .map(([label, groupedItems]) => {
      const baseSlug = slugify(label) || "eintrag";
      const count = (usedSlugs.get(baseSlug) || 0) + 1;
      usedSlugs.set(baseSlug, count);
      return {
        label,
        slug: count === 1 ? baseSlug : `${baseSlug}-${count}`,
        items: sortedItems(groupedItems)
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}

function contentTags(item) {
  const raw = Array.isArray(item.data.tagList)
    ? item.data.tagList
    : Array.isArray(item.data.tags)
      ? item.data.tags
      : [];
  return raw.filter((tag) => !["sermon", "post", "material", "project", "gallery", "page", "podcast", "podcast-series", "podcast-episode"].includes(tag));
}

function isPublicItem(item) {
  return item?.data?.draft !== true && item?.data?.listed !== false && item?.data?.index !== false;
}

const shareableTags = new Set(["sermon", "post", "material", "project", "gallery", "podcast-series", "podcast-episode"]);

function hasTag(item, tagName) {
  const desired = String(tagName || "").trim().toLowerCase();
  if (!desired) return false;
  const raw = Array.isArray(item?.data?.tags)
    ? item.data.tags
    : Array.isArray(item?.data?.tagList)
      ? item.data.tagList
      : [];
  return raw.some((tag) => String(tag || "").trim().toLowerCase() === desired);
}

function isShareableItem(item) {
  if (!item?.url || !isPublicItem(item) || !item?.data?.title) return false;
  const raw = Array.isArray(item.data.tags)
    ? item.data.tags
    : Array.isArray(item.data.tagList)
      ? item.data.tagList
      : [];
  return raw.some((tag) => shareableTags.has(String(tag || "").trim().toLowerCase()));
}

function podcastPathParts(item) {
  const normalized = item?.inputPath?.replace(/\\/g, "/") || "";
  const match = normalized.match(/\/src\/content\/podcasts\/(.+)\/index\.md$/);
  if (!match) return [];
  return match[1].split("/").filter(Boolean);
}

function resolveImageSource(src, page) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) {
    return { type: "remote", src };
  }
  if (src.startsWith("/img/")) {
    return {
      type: "passthrough",
      url: src
    };
  }
  if (src.startsWith("/assets/")) {
    return {
      type: "local",
      input: path.join(projectRoot, "src", src.slice(1)),
      url: src
    };
  }
  if (src.startsWith("/")) {
    return {
      type: "passthrough",
      url: src
    };
  }
  if (!page?.inputPath) {
    return null;
  }
  return {
    type: "local",
    input: path.join(path.dirname(page.inputPath), src),
    url: src
  };
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addFocusableCodeBlocks(value) {
  return String(value || "").replace(/<pre(?![^>]*\btabindex=)([^>]*)>/g, '<pre tabindex="0"$1>');
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizePlainText(value) {
  const lines = String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  const normalized = [];
  let previousBlank = false;
  for (const line of lines) {
    const isBlank = !line;
    if (isBlank && previousBlank) continue;
    normalized.push(line);
    previousBlank = isBlank;
  }

  return normalized.join("\n").trim();
}

function plainTextFromHtml(value) {
  const prepared = String(value || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\/\s*(p|div|section|article|blockquote|h1|h2|h3|h4|h5|h6|ul|ol|pre)\s*>/gi, "\n\n")
    .replace(/<\/\s*tr\s*>/gi, "\n")
    .replace(/<\/\s*td\s*>/gi, "\t")
    .replace(/<[^>]+>/g, " ");
  return normalizePlainText(decodeHtmlEntities(prepared));
}

function wrapCdata(value) {
  return String(value || "").replaceAll("]]>", "]]]]><![CDATA[>");
}

function resolveAudioPath(item) {
  const audio = item?.data?.audio;
  const inputPath = item?.inputPath || item?.page?.inputPath;
  if (!audio || !inputPath || /^https?:\/\//i.test(audio)) return null;
  return path.resolve(path.dirname(inputPath), audio);
}

function audioMetadataForItem(item) {
  const audioPath = resolveAudioPath(item);
  if (!audioPath || !fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile()) {
    return {
      bytes: null,
      duration: item?.data?.audio_duration || null
    };
  }

  return {
    bytes: readAudioFileSize(audioPath),
    duration: item?.data?.audio_duration || readMp3Duration(audioPath) || null
  };
}

function shareTitleLine(item) {
  const title = String(item?.data?.title || "").trim();
  const subtitle = String(item?.data?.subtitle || "").trim();
  if (title && subtitle) return `${title}: ${subtitle}`;
  return title || subtitle;
}

function shareSummary(item) {
  const summary = String(item?.data?.summary || "").trim();
  if (summary) return summary;
  return plainTextFromHtml(item?.templateContent || "").slice(0, 280).trim();
}

function shareComplexText(item) {
  const parts = [
    shareTitleLine(item),
    String(item?.data?.scripture || "").trim(),
    "",
    shareSummary(item),
    "",
    "--> zum Nachhoeren und Nachlesen unter dem Link oben",
    "",
    "--",
    "",
    plainTextFromHtml(item?.templateContent || "")
  ].filter((part, index) => part || [2, 4, 6, 8].includes(index));
  return normalizePlainText(parts.join("\n"));
}

async function renderResponsiveImage(src, alt, options = {}, page = null) {
  const resolved = resolveImageSource(src, page);
  if (!resolved) {
    return "";
  }

  const attrs = {
    alt: alt ?? "",
    loading: options.loading || "lazy",
    decoding: "async",
    sizes: options.sizes || "100vw",
    class: options.class || undefined
  };

  if (resolved.type === "remote" || resolved.type === "passthrough") {
    const finalSrc = resolved.src || resolved.url;
    return `<img src="${escapeAttribute(finalSrc)}" alt="${escapeAttribute(attrs.alt)}" loading="${escapeAttribute(attrs.loading)}" decoding="${escapeAttribute(attrs.decoding)}"${attrs.class ? ` class="${escapeAttribute(attrs.class)}"` : ""}>`;
  }

  const extension = path.extname(resolved.input).toLowerCase();
  if ([".svg", ".pdf"].includes(extension)) {
    return `<img src="${escapeAttribute(resolved.url)}" alt="${escapeAttribute(attrs.alt)}" loading="${escapeAttribute(attrs.loading)}" decoding="${escapeAttribute(attrs.decoding)}"${attrs.class ? ` class="${escapeAttribute(attrs.class)}"` : ""}>`;
  }

  const formats = extension === ".png" ? ["avif", "webp", "png"] : ["avif", "webp", "jpeg"];
  const metadata = await Image(resolved.input, {
    widths: options.widths || [320, 640, 960, 1280, 1600],
    formats,
    urlPath: "/assets/img/",
    outputDir: path.join(projectRoot, "_site", "assets", "img"),
    sharpOptions: {
      animated: true
    }
  });

  return Image.generateHTML(metadata, attrs);
}

function resolveOutputImageUrl(src, page = null, options = {}) {
  const resolved = resolveImageSource(src, page);
  if (!resolved) return null;

  if (resolved.type === "remote" || resolved.type === "passthrough") {
    return resolved.src || resolved.url;
  }

  const extension = path.extname(resolved.input).toLowerCase();
  if ([".svg", ".pdf"].includes(extension)) {
    return resolved.url;
  }

  const formats = extension === ".png" ? ["avif", "webp", "png"] : ["avif", "webp", "jpeg"];
  const metadata = Image.statsSync(resolved.input, {
    widths: options.widths || [320, 640, 960, 1280, 1600],
    formats,
    urlPath: "/assets/img/",
    outputDir: path.join(projectRoot, "_site", "assets", "img"),
    sharpOptions: {
      animated: true
    }
  });

  const preferred = metadata.jpeg || metadata.png || Object.values(metadata)[0];
  return Array.isArray(preferred) && preferred.length ? preferred[preferred.length - 1].url : null;
}

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/content/img": "img" });
  eleventyConfig.addPassthroughCopy("src/content/**/*.{jpg,jpeg,png,webp,avif,gif,svg,mp3,m4a,ogg,pdf}", {
    mode: "html-relative"
  });
  eleventyConfig.addPassthroughCopy({ "src/content/img/jingle.mp3": "img/jingle.mp3" });
  eleventyConfig.addPassthroughCopy({ "src/content/img/me": "img/me" });
  eleventyConfig.addPassthroughCopy({ "src/content/img/players": "img/players" });
  eleventyConfig.addPassthroughCopy({ "src/content/img/sermons": "img/sermons" });
  eleventyConfig.addPassthroughCopy({ "src/content/img/slider": "img/slider" });
  eleventyConfig.addPassthroughCopy({ "src/icon.svg": "icon.svg" });
  eleventyConfig.addPassthroughCopy({ "src/site.webmanifest": "site.webmanifest" });
  eleventyConfig.addPassthroughCopy({ "src/assets/generated/apple-touch-icon.png": "apple-touch-icon.png" });

  eleventyConfig.addFilter("readableDate", (value, format = "d. LLLL yyyy") => {
    if (!value) return "";
    return DateTime.fromJSDate(new Date(value), { zone: "Europe/Berlin" }).toFormat(format);
  });

  eleventyConfig.addFilter("htmlDateString", (value) => {
    if (!value) return "";
    return DateTime.fromJSDate(new Date(value), { zone: "Europe/Berlin" }).toFormat("yyyy-LL-dd");
  });

  eleventyConfig.addFilter("isoDateTimeString", (value) => {
    if (!value) return "";
    return DateTime.fromJSDate(new Date(value), { zone: "Europe/Berlin" }).toISO({
      suppressMilliseconds: true
    });
  });

  eleventyConfig.addFilter("rssBuildDate", () => {
    return new Date().toUTCString();
  });

  eleventyConfig.addFilter("absoluteUrl", (path, site) => {
    try {
      return new URL(path, site.url).toString();
    } catch {
      return path;
    }
  });

  eleventyConfig.addFilter("sortByDateDesc", (items = []) => {
    return sortedItems(items);
  });

  eleventyConfig.addFilter("slugify", slugify);

  eleventyConfig.addFilter("excerpt", (value, length = 180) => {
    const plain = String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) return "";
    return plain.length <= length ? plain : `${plain.slice(0, length).trim()}…`;
  });

  eleventyConfig.addFilter("plainText", (value) => {
    return plainTextFromHtml(value);
  });

  eleventyConfig.addFilter("xmlCdata", (value) => {
    return wrapCdata(value);
  });

  eleventyConfig.addFilter("audioDurationForFeed", (item) => {
    return audioMetadataForItem(item).duration;
  });

  eleventyConfig.addFilter("audioLengthBytes", (item) => {
    return audioMetadataForItem(item).bytes;
  });

  eleventyConfig.addFilter("shareTitleLine", (item) => {
    return shareTitleLine(item);
  });

  eleventyConfig.addFilter("shareSummary", (item) => {
    return shareSummary(item);
  });

  eleventyConfig.addFilter("shareComplexText", (item) => {
    return shareComplexText(item);
  });

  eleventyConfig.addFilter("imageUrl", (src, page = null) => {
    return resolveOutputImageUrl(src, page);
  });

  eleventyConfig.addFilter("focusableCodeBlocks", (value) => {
    return addFocusableCodeBlocks(value);
  });

  eleventyConfig.addFilter("podcastEpisodesForSeries", (items = [], seriesSlug = "") => {
    return sortedItems(items.filter((item) => item?.data?.podcastSeriesSlug === seriesSlug));
  });

  eleventyConfig.addNunjucksAsyncShortcode("responsiveImage", async (src, alt, options = {}, page = null) => {
    return renderResponsiveImage(src, alt, options, page);
  });

  eleventyConfig.on("eleventy.after", () => {
    copyEntryMedia();
  });

  eleventyConfig.addCollection("sermons", (collectionApi) => {
    return sortedItems(collectionApi.getFilteredByGlob("src/content/sermons/**/index.md").filter(isPublicItem));
  });
  eleventyConfig.addCollection("posts", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/posts/**/index.md").filter(isPublicItem)));
  eleventyConfig.addCollection("materials", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/materials/**/index.md").filter(isPublicItem)));
  eleventyConfig.addCollection("schoolMaterials", (collectionApi) => {
    return sortedItems(collectionApi.getFilteredByGlob("src/content/materials/**/index.md").filter((item) => isPublicItem(item) && hasTag(item, "schule")));
  });
  eleventyConfig.addCollection("projects", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/projects/**/index.md").filter(isPublicItem)));
  eleventyConfig.addCollection("galleries", (collectionApi) => {
    return sortedItems(collectionApi.getAll().filter((item) => item?.url && isPublicItem(item) && hasTag(item, "gallery")));
  });
  eleventyConfig.addCollection("podcastSeries", (collectionApi) => {
    return sortedItems(collectionApi.getFilteredByGlob("src/content/podcasts/**/index.md").filter((item) => {
      if (!isPublicItem(item)) return false;
      return podcastPathParts(item).length === 1;
    }));
  });
  eleventyConfig.addCollection("podcastEpisodes", (collectionApi) => {
    return sortedItems(collectionApi.getFilteredByGlob("src/content/podcasts/**/index.md").filter((item) => {
      if (!isPublicItem(item)) return false;
      return podcastPathParts(item).length >= 2;
    }));
  });
  eleventyConfig.addCollection("podcasts", (collectionApi) => {
    return sortedItems(collectionApi.getFilteredByGlob("src/content/podcasts/**/index.md").filter(isPublicItem));
  });

  eleventyConfig.addCollection("shareableContent", (collectionApi) => {
    return sortedItems(collectionApi.getAll().filter(isShareableItem));
  });

  eleventyConfig.addCollection("publishedContent", (collectionApi) => {
    return sortedItems(collectionApi.getAll().filter(isShareableItem));
  });

  eleventyConfig.addCollection("sermonsByYear", (collectionApi) => {
    const sermons = collectionApi.getFilteredByGlob("src/content/sermons/**/index.md").filter(isPublicItem);
    const grouped = new Map();

    for (const sermon of sermons) {
      const year = DateTime.fromJSDate(new Date(sermon.data.date), { zone: "Europe/Berlin" }).toFormat("yyyy");
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year).push(sermon);
    }

    return [...grouped.entries()]
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, items]) => ({
        year,
        items: sortedItems(items)
      }));
  });

  eleventyConfig.addCollection("sermonSeries", (collectionApi) => {
    return uniqueValues(collectionApi.getFilteredByGlob("src/content/sermons/**/index.md"), (item) => item.data.series ? [item.data.series] : []);
  });

  eleventyConfig.addCollection("sermonOccasions", (collectionApi) => {
    return uniqueValues(collectionApi.getFilteredByGlob("src/content/sermons/**/index.md"), (item) => item.data.occasion ? [item.data.occasion] : []);
  });

  eleventyConfig.addCollection("sermonScriptures", (collectionApi) => {
    return uniqueValues(collectionApi.getFilteredByGlob("src/content/sermons/**/index.md"), (item) => item.data.scripture ? [item.data.scripture] : []);
  });

  eleventyConfig.addCollection("contentTags", (collectionApi) => {
    const baseItems = collectionApi.getAll().filter((item) => item.url && item.data.title);
    return uniqueValues(baseItems, contentTags);
  });

  eleventyConfig.addCollection("upcomingServices", (collectionApi) => {
    const now = DateTime.now().setZone("Europe/Berlin").startOf("day");
    const services = [];

    for (const sermon of collectionApi.getFilteredByGlob("src/content/sermons/**/index.md").filter(isPublicItem)) {
      for (const event of sermon.data.events || []) {
        if (!event?.date) continue;
        const eventDate = DateTime.fromISO(event.date, { zone: "utc" }).setZone("Europe/Berlin");
        if (!eventDate.isValid || eventDate < now) continue;

        services.push({
          title: event.title || "Gottesdienst",
          location: event.location || "",
          occasion: event.occasion || sermon.data.occasion || "",
          scripture: sermon.data.scripture || "",
          liturgyColor: event.liturgy_color || sermon.data.liturgy_color || "",
          date: eventDate.toISO(),
          displayTime: event.time || eventDate.toFormat("H:mm 'Uhr'"),
          sermonTitle: sermon.data.title,
          sermonUrl: sermon.url
        });
      }
    }

    return services.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
