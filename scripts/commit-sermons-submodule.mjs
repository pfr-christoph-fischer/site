import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sermonsRoot = path.join(projectRoot, "src", "content", "sermons");

function parseArgs(argv) {
  const out = { message: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--message" || argv[i] === "-m") {
      out.message = argv[i + 1] || null;
      i += 1;
    }
  }
  return out;
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: sermonsRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.message) {
    console.error("Usage: npm run commit:sermons-submodule -- --message \"Your commit message\"");
    process.exit(1);
  }

  runGit(["add", "-A"]);
  runGit(["commit", "-m", options.message]);
  runGit(["push"]);
}

main();
