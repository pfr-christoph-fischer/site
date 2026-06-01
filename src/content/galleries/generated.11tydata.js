export default {
  tags: ["gallery"],
  eleventyComputed: {
    title: (data) => data.gallery?.title || "Galerie",
    summary: (data) => data.gallery?.summary || null,
    images: (data) => data.gallery?.images || [],
    socialImage: (data) => data.gallery?.images?.[0]?.src || data.site?.defaultSocialImage || null,
    permalink: (data) => `/galerie/${data.gallery?.slug || data.page.fileSlug}/`
  }
};
