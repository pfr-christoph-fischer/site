import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const postsRoot = path.join(projectRoot, "src", "content", "posts");
const defaultFeedUrl = "https://influence.christoph-fischer.de/api/feed/published.json";

loadEnv(projectRoot);

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function slugify(input) {
  return String(input || "")
    .replace(/ä/gi, "ae").replace(/ö/gi, "oe").replace(/ü/gi, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function asPosts(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["posts", "items", "entries", "published", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function postFields(post) {
  const facebook = post.texts?.facebook || post.facebook || post.platforms?.facebook || post.social?.facebook || {};
  const text = firstValue(facebook.text, facebook.message, post.facebook_text, post.facebookText, post.text, post.message);
  const imageValue = firstValue(facebook.image, facebook.image_url, facebook.imageUrl, post.facebook_image, post.facebookImage);
  const listedImages = Array.isArray(post.images) ? post.images : [];
  const facebookImage = listedImages.find((item) => item.path === "assets/background-1.91x1.webp")
    || listedImages.find((item) => /facebook/i.test(item.path || item.url || ""))
    || listedImages.find((item) => /instagram-feed/i.test(item.path || item.url || ""))
    || listedImages[0];
  const selectedImage = imageValue || facebookImage;
  const image = typeof selectedImage === "object"
    ? firstValue(selectedImage.url, selectedImage.src, selectedImage.asset?.url, selectedImage.asset?.src)
    : selectedImage;
  const title = firstValue(post.title, post.headline, post.name, facebook.title, text && String(text).split(/\s+/).slice(0, 8).join(" "));
  const mainMessage = firstValue(post.mainMessage, post.main_message, text);
  const id = firstValue(post.id, post.uuid, post.slug, post.url, post.link, title);
  const publishedDates = (Array.isArray(post.publications) ? post.publications : [])
    .map((publication) => publication?.publishedAt)
    .filter((value) => value && !Number.isNaN(new Date(value).valueOf()))
    .sort((a, b) => new Date(a) - new Date(b));
  const date = firstValue(publishedDates[0], post.date, post.published_at, post.publishedAt, post.created_at, post.createdAt);
  const coverAlt = firstValue(facebookImage?.altText, post.altText, `Bild zu ${title}`);
  return { id, title, text, mainMessage, image, date, coverAlt, sourceUrl: firstValue(post.url, post.link, post.permalink) };
}

function findExistingPost(sourceId) {
  if (!fs.existsSync(postsRoot)) return null;
  for (const directory of fs.readdirSync(postsRoot, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const filePath = path.join(postsRoot, directory.name, "index.md");
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    if (raw.match(new RegExp(`^source_id:\\s*${escapeRegExp(yamlString(sourceId))}\\s*$`, "m"))) return filePath;
  }
  return null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extensionFromUrl(url) {
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(extension) ? extension : ".jpg";
  } catch {
    return ".jpg";
  }
}

function postSlug(fields) {
  const date = String(fields.date || "").slice(0, 10);
  return slugify(`${date}-${fields.title}`) || `influence-${slugify(fields.id)}` || "influence-post";
}

function renderPost(fields, imageName) {
  const date = new Date(fields.date || Date.now());
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid date for influence post ${fields.id}`);
  const tags = ["post", "influence"];
  return [
    "---",
    `title: ${yamlString(fields.title)}`,
    `summary: ${yamlString(String(fields.mainMessage).replace(/\s+/g, " ").trim())}`,
    `date: ${date.toISOString()}`,
    `tags: [${tags.map(yamlString).join(", ")}]`,
    `source_id: ${yamlString(fields.id)}`,
    "source: influence",
    ...(fields.sourceUrl ? [`source_url: ${yamlString(fields.sourceUrl)}`] : []),
    ...(imageName ? [`cover: ${yamlString(imageName)}`, `cover_alt: ${yamlString(fields.coverAlt)}`] : []),
    "submodule_skip: true",
    "---",
    "",
    String(fields.text).trim(),
    ""
  ].join("\n");
}

function authHeaders() {
  const username = process.env.INFLUENCE_FEED_USERNAME;
  const password = process.env.INFLUENCE_FEED_PASSWORD;
  if (!username && !password) return {};
  if (!username || !password) throw new Error("INFLUENCE_FEED_USERNAME and INFLUENCE_FEED_PASSWORD must be configured together.");
  return { authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` };
}

async function fetchResponse(url, options = {}, useAuth = true) {
  const response = await fetch(url, { headers: { accept: "application/json", ...(useAuth ? authHeaders() : {}) }, ...options });
  if (!response.ok) {
    const hint = response.status === 401 ? " Configure INFLUENCE_FEED_USERNAME and INFLUENCE_FEED_PASSWORD in .env." : "";
    throw new Error(`Influence feed request failed (${response.status} ${response.statusText}).${hint}`);
  }
  return response;
}

async function sync() {
  const feedUrl = process.env.INFLUENCE_FEED_URL || defaultFeedUrl;
  const response = await fetchResponse(feedUrl);
  const payload = await response.json();
  const posts = asPosts(payload).map(postFields).filter((post) => post.id && post.title && post.text);
  if (!posts.length && asPosts(payload).length) throw new Error("Influence feed contained posts, but none had an id, title, and Facebook text.");

  fs.mkdirSync(postsRoot, { recursive: true });
  for (const fields of posts) {
    const existing = findExistingPost(fields.id);
    const desiredSlug = postSlug(fields);
    const existingDirectory = existing ? path.dirname(existing) : null;
    const desiredDirectory = path.join(postsRoot, desiredSlug);
    if (existingDirectory && existingDirectory !== desiredDirectory && !fs.existsSync(desiredDirectory)) {
      fs.renameSync(existingDirectory, desiredDirectory);
    }
    const directory = existingDirectory && existingDirectory !== desiredDirectory && fs.existsSync(desiredDirectory)
      ? desiredDirectory
      : (existingDirectory || desiredDirectory);
    fs.mkdirSync(directory, { recursive: true });
    let imageName = null;
    if (fields.image) {
      imageName = `${desiredSlug}${extensionFromUrl(fields.image)}`;
      const imageResponse = await fetchResponse(fields.image, {}, new URL(fields.image).origin === new URL(feedUrl).origin);
      fs.writeFileSync(path.join(directory, imageName), Buffer.from(await imageResponse.arrayBuffer()));
    }
    fs.writeFileSync(path.join(directory, "index.md"), renderPost(fields, imageName));
  }
  console.log(`Synced ${posts.length} influence post${posts.length === 1 ? "" : "s"}.`);
}

sync().catch((error) => {
  console.error(`Influence post sync failed: ${error.message}`);
  process.exitCode = 1;
});
