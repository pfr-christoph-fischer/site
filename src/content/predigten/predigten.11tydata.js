function latestSermon(data) {
  return data.collections?.sermons?.find((item) => item?.url && item?.data?.cover) || null;
}

export default {
  eleventyComputed: {
    socialImage: (data) => latestSermon(data)?.data?.cover || data.socialImage,
    socialImageAlt: (data) => latestSermon(data)?.data?.cover_alt || data.socialImageAlt,
    socialImageContext: (data) => latestSermon(data) || data.socialImageContext
  }
};
