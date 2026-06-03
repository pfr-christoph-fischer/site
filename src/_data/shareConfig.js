const defaultBatchUrls = [
  "https://www.facebook.com/sharer/sharer.php?u=<permalink>",
  "https://kirche.social/@christoph",
  "https://bsky.app/profile/christoph-fischer.de",
  "https://www.threads.com/",
  "https://www.instagram.com",
  "https://www.pixelfed.de/",
  "https://gaeufelden.communiapp.de/page/login/tab/tutorial"
];

function parseBatchUrls(rawValue) {
  if (!rawValue) return defaultBatchUrls;
  return String(rawValue)
    .split(/\r?\n|,/)
    .map((entry) => entry.trim().replace(/^['"]+|['"]+$/g, ""))
    .filter(Boolean);
}

export default {
  batchUrls: parseBatchUrls(process.env.SHARE_BATCH_URLS)
};
