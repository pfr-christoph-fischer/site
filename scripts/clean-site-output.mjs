import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const siteRoot = path.join(projectRoot, "_site");
const previewRoot = path.join(siteRoot, "img", "previews");
const pagefindRoot = path.join(projectRoot, ".pagefind");

fs.mkdirSync(siteRoot, { recursive: true });

const siteCleanup = spawnSync("find", [siteRoot, "-mindepth", "1", "-delete"], {
  stdio: "inherit"
});

if (siteCleanup.status !== 0) {
  process.exit(siteCleanup.status ?? 1);
}

const pagefindCleanup = spawnSync("rm", ["-rf", pagefindRoot], {
  stdio: "inherit"
});

if (pagefindCleanup.status !== 0) {
  process.exit(pagefindCleanup.status ?? 1);
}

fs.mkdirSync(previewRoot, { recursive: true });
