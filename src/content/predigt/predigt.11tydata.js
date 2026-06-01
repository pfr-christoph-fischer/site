export default {
  eleventyExcludeFromCollections: true,
  index: false,
  eleventyComputed: {
    title: (data) => data.sermon?.data?.title || "Predigt",
    description: (data) => data.sermon?.data?.summary || data.site?.description || "",
    canonical: (data) => data.sermon?.url || "/predigten/"
  }
};
