function isEntryPage(data) {
  const inputPath = data.page?.inputPath?.replace(/\\/g, "/") || "";
  return /\/src\/content\/posts\/[^/]+\/index\.md$/.test(inputPath);
}

export default {
  eleventyComputed: {
    layout: (data) => isEntryPage(data) ? "layouts/content-entry.njk" : data.layout,
    tags: (data) => isEntryPage(data) ? ["post"] : (data.tags || []),
    contentLabel: (data) => isEntryPage(data) ? "Blog" : data.contentLabel,
    schemaType: (data) => isEntryPage(data) ? "BlogPosting" : data.schemaType,
    description: (data) => data.summary || data.description || null,
    coverAlt: (data) => data.cover_alt || null,
    socialImageAlt: (data) => data.cover_alt || data.socialImageAlt || null,
    tagList: (data) => isEntryPage(data) && Array.isArray(data.tags) ? data.tags.filter((tag) => tag !== "post") : (data.tagList || []),
    permalink: (data) => isEntryPage(data) ? `/blog/${data.page.fileSlug}/` : data.permalink
  }
};
