import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadEnv } from "./lib/env.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const siteRoot = path.join(projectRoot, "_site");
loadEnv(projectRoot);

const target = process.env.DEPLOY_TARGET;
if (!target) {
  console.error("Missing DEPLOY_TARGET environment variable. Example: user@example:/var/www/christoph-fischer.de/");
  process.exit(1);
}

const deleteFlag = process.env.DEPLOY_DELETE === "true" ? "--delete" : null;
const extraArgs = (process.env.DEPLOY_RSYNC_ARGS || "").split(/\s+/).filter(Boolean);
const args = [
  "-az",
  "--human-readable",
  "--progress",
  ...extraArgs,
  ...(deleteFlag ? [deleteFlag] : []),
  `${siteRoot}/`,
  target
];

const result = spawnSync("rsync", args, {
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
