export default {
  layout: "layouts/sermon.njk",
  tags: ["sermon"],
  eleventyComputed: {
    listed: (data) => data.listed !== false,
    index: (data) => data.index !== undefined ? data.index : data.listed !== false,
    federate: (data) => data.federate !== undefined ? data.federate : data.listed !== false,
    description: (data) => data.summary || data.description || null,
    coverAlt: (data) => data.cover_alt || null,
    tagList: (data) => {
      const explicit = Array.isArray(data.tags)
        ? data.tags.filter((tag) => !["sermon", "post", "material", "project", "gallery", "page"].includes(tag))
        : [];
      return explicit.length ? explicit : ["Predigt"];
    },
    relatedSermons: (data) => {
      const sermons = data.collections?.sermons || [];
      return sermons
        .filter((item) => item.url !== data.page.url)
        .filter((item) => {
          return (
            (data.series && item.data.series === data.series) ||
            (data.scripture && item.data.scripture === data.scripture) ||
            (data.occasion && item.data.occasion === data.occasion)
          );
        })
        .slice(0, 3);
    },
    permalink: (data) => {
      const date = new Date(data.date);
      const year = Number.isNaN(date.getTime()) ? "undated" : String(date.getUTCFullYear());
      return `/predigten/${year}/${data.page.fileSlug}/`;
    }
  }
};