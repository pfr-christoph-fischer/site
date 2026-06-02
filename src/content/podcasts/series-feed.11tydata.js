export default {
  eleventyComputed: {
    permalink: (data) => {
      const series = data.series;
      if (!series || series.data?.podcast_external_feed) {
        return false;
      }
      return `${series.url}feed.xml`;
    }
  }
};
