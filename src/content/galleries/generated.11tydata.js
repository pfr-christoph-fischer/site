export default {
  tags: ["gallery"],
  eleventyComputed: {
    title: (data) => data.gallery?.title || "Galerie",
    summary: (data) => data.gallery?.summary || null,
    images: (data) => data.gallery?.images || [],
    galleryVariant: (data) => data.gallery?.variant || "default",
    socialImage: (data) => data.gallery?.images?.[0]?.src || data.site?.defaultSocialImage || null,
    socialImageAlt: (data) => data.gallery?.images?.[0]?.alt || data.site?.defaultSocialImageAlt || null,
    permalink: (data) => `/galerie/${data.gallery?.slug || data.page.fileSlug}/`
  }
};
