import { readFrontmatterTags } from "../../../scripts/lib/frontmatter.mjs";

function normalizedInputPath(data) {
  return data.page?.inputPath?.replace(/\\/g, "/") || "";
}

function podcastPathParts(data) {
  const match = normalizedInputPath(data).match(/\/src\/content\/podcasts\/(.+)\/index\.md$/);
  return match ? match[1].split("/").filter(Boolean) : [];
}

function isSeriesPage(data) {
  return podcastPathParts(data).length === 1;
}

function isEpisodePage(data) {
  return podcastPathParts(data).length >= 2;
}

function seriesSlug(data) {
  return podcastPathParts(data)[0] || null;
}

function seriesFeedUrl(data) {
  if (isSeriesPage(data)) {
    return data.podcast_external_feed || `/podcast/${data.page.fileSlug}/feed.xml`;
  }
  if (isEpisodePage(data)) {
    return `/podcast/${seriesSlug(data)}/feed.xml`;
  }
  return null;
}

function entryTags(data) {
  return readFrontmatterTags(data.page?.inputPath);
}

export default {
  eleventyComputed: {
    layout: (data) => {
      if (isSeriesPage(data)) return "layouts/podcast-series.njk";
      if (isEpisodePage(data)) return "layouts/content-entry.njk";
      return data.layout;
    },
    tags: (data) => {
      if (isSeriesPage(data)) return ["podcast-series", ...entryTags(data).filter((tag) => tag !== "podcast-series")];
      if (isEpisodePage(data)) return ["podcast-episode", ...entryTags(data).filter((tag) => tag !== "podcast-episode")];
      return data.tags || [];
    },
    contentLabel: (data) => {
      if (isSeriesPage(data)) return "Podcast";
      if (isEpisodePage(data)) return "Podcast-Folge";
      return data.contentLabel;
    },
    schemaType: (data) => {
      if (isSeriesPage(data)) return "PodcastSeries";
      if (isEpisodePage(data)) return "PodcastEpisode";
      return data.schemaType;
    },
    description: (data) => data.summary || data.description || null,
    license: (data) => data.license || "CC BY-SA 4.0",
    license_url: (data) => data.license_url || "https://creativecommons.org/licenses/by-sa/4.0/deed.de",
    coverAlt: (data) => data.cover_alt || null,
    socialImageAlt: (data) => data.cover_alt || data.socialImageAlt || null,
    podcastSeriesSlug: (data) => seriesSlug(data),
    podcastFeedUrl: (data) => seriesFeedUrl(data),
    tagList: (data) => {
      if (isSeriesPage(data)) return entryTags(data).filter((tag) => tag !== "podcast-series");
      if (isEpisodePage(data)) return entryTags(data).filter((tag) => tag !== "podcast-episode");
      return data.tagList || [];
    },
    permalink: (data) => {
      if (isSeriesPage(data)) return `/podcast/${data.page.fileSlug}/`;
      if (isEpisodePage(data)) return `/podcast/${seriesSlug(data)}/${data.page.fileSlug}/`;
      return data.permalink;
    }
  }
};
