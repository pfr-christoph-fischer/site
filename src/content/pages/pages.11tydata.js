export default {
  eleventyComputed: {
    description: (data) => data.summary || data.description || null
  }
};
