import { readFrontmatterTags } from "../../../scripts/lib/frontmatter.mjs";

function isEntryPage(data) {
  const inputPath = data.page?.inputPath?.replace(/\\/g, "/") || "";
  return /\/src\/content\/materials\/[^/]+\/index\.md$/.test(inputPath);
}

function entryTags(data) {
  return readFrontmatterTags(data.page?.inputPath);
}

export default {
  eleventyComputed: {
    layout: (data) => isEntryPage(data) ? "layouts/content-entry.njk" : data.layout,
    tags: (data) => isEntryPage(data) ? ["material", ...entryTags(data).filter((tag) => tag !== "material")] : (data.tags || []),
    contentLabel: (data) => isEntryPage(data) ? "Material" : data.contentLabel,
    schemaType: (data) => isEntryPage(data) ? "LearningResource" : data.schemaType,
    description: (data) => data.summary || data.description || null,
    license: (data) => data.license || "CC BY-SA 4.0",
    license_url: (data) => data.license_url || "https://creativecommons.org/licenses/by-sa/4.0/deed.de",
    coverAlt: (data) => data.cover_alt || null,
    socialImageAlt: (data) => data.cover_alt || data.socialImageAlt || null,
    tagList: (data) => isEntryPage(data) ? entryTags(data).filter((tag) => tag !== "material") : (data.tagList || []),
    permalink: (data) => isEntryPage(data) ? `/material/${data.page.fileSlug}/` : data.permalink
  }
};
