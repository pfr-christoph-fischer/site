import { readFrontmatterTags } from "../../../scripts/lib/frontmatter.mjs";

function isEntryPage(data) {
  const inputPath = data.page?.inputPath?.replace(/\\/g, "/") || "";
  return /\/src\/content\/projects\/.+\/index\.md$/.test(inputPath);
}

function entryTags(data) {
  return readFrontmatterTags(data.page?.inputPath);
}

export default {
  eleventyComputed: {
    layout: (data) => isEntryPage(data) ? "layouts/content-entry.njk" : data.layout,
    tags: (data) => isEntryPage(data) ? ["project", ...entryTags(data).filter((tag) => tag !== "project")] : (data.tags || []),
    contentLabel: (data) => isEntryPage(data) ? "Open Source" : data.contentLabel,
    schemaType: (data) => isEntryPage(data) ? "SoftwareSourceCode" : data.schemaType,
    description: (data) => data.summary || data.description || null,
    license: (data) => data.license || "GPL 3.0 or later",
    license_url: (data) => data.license_url || "https://www.gnu.org/licenses/gpl-3.0.txt",
    coverAlt: (data) => data.cover_alt || null,
    socialImageAlt: (data) => data.cover_alt || data.socialImageAlt || null,
    tagList: (data) => isEntryPage(data) ? entryTags(data).filter((tag) => tag !== "project") : (data.tagList || []),
    permalink: (data) => isEntryPage(data) ? `/open-source/${data.page.fileSlug}/` : data.permalink
  }
};
