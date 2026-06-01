import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "./lib/paths.mjs";

const stageDirName = ".build_site";
const previousDirName = ".site_previous";
const stageRoot = path.join(projectRoot, stageDirName);
const siteRoot = path.join(projectRoot, "_site");
const previousRoot = path.join(projectRoot, previousDirName);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ...options.env
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function safeRemove(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch {
    spawnSync("rm", ["-rf", targetPath], {
      cwd: projectRoot,
      stdio: "inherit"
    });
  }
}

function moveIfExists(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) return;
  if (fs.existsSync(toPath)) {
    safeRemove(toPath);
  }
  fs.renameSync(fromPath, toPath);
}

safeRemove(stageRoot);
safeRemove(previousRoot);

run("node", ["scripts/generate-site-assets.mjs"]);
run("node", ["scripts/validate-content.mjs"]);
run("npx", ["@11ty/eleventy"], {
  env: { SITE_OUTPUT_DIR: stageDirName }
});
run("node", ["scripts/copy-sermon-assets.mjs"], {
  env: { SITE_OUTPUT_DIR: stageDirName }
});
run("npx", ["pagefind", "--site", stageDirName]);
run("node", ["scripts/validate-content.mjs", "--site"], {
  env: { SITE_OUTPUT_DIR: stageDirName }
});

moveIfExists(siteRoot, previousRoot);
moveIfExists(stageRoot, siteRoot);
safeRemove(previousRoot);

console.log("Staged site build promoted to _site.");
