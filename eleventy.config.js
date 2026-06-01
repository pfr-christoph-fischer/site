import path from "node:path";
import { fileURLToPath } from "node:url";
import Image from "@11ty/eleventy-img";
import { DateTime } from "luxon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;
const outputDirName = process.env.SITE_OUTPUT_DIR || "_site";
const outputRoot = path.resolve(projectRoot, outputDirName);

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
  return raw.filter((tag) => !["sermon", "post", "material", "project", "gallery", "page"].includes(tag));
}

function isPublicItem(item) {
  return item?.data?.draft !== true && item?.data?.listed !== false && item?.data?.index !== false;
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
    return null;
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
    return `<img src="${finalSrc}" alt="${attrs.alt}" loading="${attrs.loading}" decoding="${attrs.decoding}"${attrs.class ? ` class="${attrs.class}"` : ""}>`;
  }

  const extension = path.extname(resolved.input).toLowerCase();
  if ([".svg", ".pdf"].includes(extension)) {
    return `<img src="${resolved.url}" alt="${attrs.alt}" loading="${attrs.loading}" decoding="${attrs.decoding}"${attrs.class ? ` class="${attrs.class}"` : ""}>`;
  }

  const formats = extension === ".png" ? ["avif", "webp", "png"] : ["avif", "webp", "jpeg"];
  const metadata = await Image(resolved.input, {
    widths: options.widths || [320, 640, 960, 1280, 1600],
    formats,
    urlPath: "/assets/img/",
    outputDir: path.join(outputRoot, "assets", "img"),
    sharpOptions: {
      animated: true
    }
  });

  return Image.generateHTML(metadata, attrs);
}

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("src/content/**/*.{jpg,jpeg,png,webp,avif,gif,svg,mp3,m4a,ogg,pdf}", {
    mode: "html-relative"
  });
  eleventyConfig.addPassthroughCopy({ "../current/public/img": "img" });
  eleventyConfig.addPassthroughCopy({ "../current/public/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "../current/public/favicon.ico": "favicon.ico" });
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

  eleventyConfig.addNunjucksAsyncShortcode("responsiveImage", async (src, alt, options = {}, page = null) => {
    return renderResponsiveImage(src, alt, options, page);
  });

  eleventyConfig.addCollection("sermons", (collectionApi) => {
    return sortedItems(collectionApi.getFilteredByGlob("src/content/sermons/**/index.md").filter(isPublicItem));
  });
  eleventyConfig.addCollection("posts", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/posts/**/index.md").filter(isPublicItem)));
  eleventyConfig.addCollection("materials", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/materials/**/index.md").filter(isPublicItem)));
  eleventyConfig.addCollection("projects", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/projects/**/index.md").filter(isPublicItem)));
  eleventyConfig.addCollection("galleries", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/galleries/**/index.@(md|njk)").filter(isPublicItem)));
  eleventyConfig.addCollection("podcasts", (collectionApi) => sortedItems(collectionApi.getFilteredByGlob("src/content/podcasts/**/index.md").filter(isPublicItem)));

  eleventyConfig.addCollection("publishedContent", (collectionApi) => {
    const groups = [
      collectionApi.getFilteredByGlob("src/content/sermons/**/index.md"),
      collectionApi.getFilteredByGlob("src/content/posts/**/index.md"),
      collectionApi.getFilteredByGlob("src/content/materials/**/index.md"),
      collectionApi.getFilteredByGlob("src/content/projects/**/index.md"),
      collectionApi.getFilteredByGlob("src/content/galleries/**/index.@(md|njk)"),
      collectionApi.getFilteredByGlob("src/content/podcasts/**/index.md")
    ];

    return sortedItems(groups.flat().filter((item) => {
      if (!item.url || !isPublicItem(item)) return false;
      return !!item.data.title;
    }));
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

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: outputDirName
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
