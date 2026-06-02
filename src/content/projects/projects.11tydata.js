function isEntryPage(data) {
  const inputPath = data.page?.inputPath?.replace(/\\/g, "/") || "";
  return /\/src\/content\/projects\/.+\/index\.md$/.test(inputPath);
}

export default {
  eleventyComputed: {
    layout: (data) => isEntryPage(data) ? "layouts/content-entry.njk" : data.layout,
    tags: (data) => isEntryPage(data) ? ["project"] : (data.tags || []),
    contentLabel: (data) => isEntryPage(data) ? "Open Source" : data.contentLabel,
    schemaType: (data) => isEntryPage(data) ? "SoftwareSourceCode" : data.schemaType,
    description: (data) => data.summary || data.description || null,
    coverAlt: (data) => data.cover_alt || null,
    socialImageAlt: (data) => data.cover_alt || data.socialImageAlt || null,
    tagList: (data) => isEntryPage(data) && Array.isArray(data.tags) ? data.tags.filter((tag) => tag !== "project") : (data.tagList || []),
    permalink: (data) => isEntryPage(data) ? `/open-source/${data.page.fileSlug}/` : data.permalink
  }
};
