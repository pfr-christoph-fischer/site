import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../../scripts/lib/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");
loadEnv(projectRoot);

const baseUrl = process.env.ACTIVITYPUB_BASE_URL || "https://www.christoph-fischer.de";
const username = process.env.ACTIVITYPUB_USERNAME || "christoph";
const dataDir = process.env.ACTIVITYPUB_DATA_DIR || path.join(backendRoot, "data");
const baseDomain = new URL(baseUrl).hostname;
const canonicalDomain = process.env.ACTIVITYPUB_DOMAIN || baseDomain.replace(/^www\./, "");

export const config = {
  backendRoot,
  projectRoot,
  dataDir,
  baseUrl,
  domain: canonicalDomain,
  username,
  actorHandle: `acct:${username}@${canonicalDomain}`,
  actorHandleAliases: [`acct:${username}@${canonicalDomain}`, `acct:${username}@${baseDomain}`],
  actorId: `${baseUrl}/users/${username}`,
  inboxId: `${baseUrl}/users/${username}/inbox`,
  outboxId: `${baseUrl}/users/${username}/outbox`,
  followersId: `${baseUrl}/users/${username}/followers`,
  followingId: `${baseUrl}/users/${username}/following`,
  featuredId: `${baseUrl}/users/${username}/featured`,
  displayName: process.env.ACTIVITYPUB_DISPLAY_NAME || "Christoph Fischer",
  summary: process.env.ACTIVITYPUB_SUMMARY || "Pfarrer, Predigten, Materialien, Blog und digitale Projekte.",
  websiteUrl: process.env.ACTIVITYPUB_WEBSITE_URL || baseUrl,
  iconUrl: process.env.ACTIVITYPUB_ICON_URL || `${baseUrl}/img/podcast.jpg`,
  imageUrl: process.env.ACTIVITYPUB_IMAGE_URL || `${baseUrl}/img/me/official/202302-01.jpg`,
  publicKeyPath: process.env.ACTIVITYPUB_PUBLIC_KEY_PATH || path.join(projectRoot, "..", "current", "keys", "public.pem"),
  privateKeyPath: process.env.ACTIVITYPUB_PRIVATE_KEY_PATH || path.join(projectRoot, "..", "current", "keys", "private.pem"),
  host: process.env.ACTIVITYPUB_HOST || "127.0.0.1",
  port: Number(process.env.ACTIVITYPUB_PORT || 8787),
  requestBodyLimit: Number(process.env.ACTIVITYPUB_REQUEST_BODY_LIMIT || 1024 * 1024)
};
