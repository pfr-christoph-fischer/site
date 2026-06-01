import path from "node:path";

export const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
export const siteRoot = process.env.SITE_OUTPUT_DIR
  ? path.resolve(projectRoot, process.env.SITE_OUTPUT_DIR)
  : path.join(projectRoot, "_site");
