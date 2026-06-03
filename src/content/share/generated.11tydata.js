export default {
  tags: ["share-page"],
  listed: false,
  index: false,
  search: false,
  eleventyComputed: {
    title: (data) => data.entry?.data?.title ? `${data.entry.data.title} teilen` : "Teilen",
    subtitle: (data) => data.entry?.data?.subtitle || null,
    summary: (data) => data.entry?.data?.summary || null,
    permalink: (data) => data.entry?.url ? `${data.entry.url}share/` : false
  }
};
