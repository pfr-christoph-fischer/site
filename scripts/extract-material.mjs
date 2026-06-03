import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import matter from "gray-matter";

const org = "pfr-christoph-fischer";
const branch = "main";

const folderName = process.argv[2];
const type = process.argv[3] ?? "materials";

if (!folderName) {
  throw new Error("Usage: npm run extract:material -- <folder> [type]");
}

const prefix = {
    materials: "material",
    sermons: "predigt",
    projects: "projekt",
    posts: "artikel",
    podcasts: "podcast",
}


const repoName = `${prefix[type] ?? type}-${folderName}`;

const contentPath = path.join("src/content", type, folderName);
const indexPath = path.join(contentPath, "index.md");
const repoSshUrl = `git@github.com:${org}/${repoName}.git`;

function run(command, args, opts = {}) {
  execFileSync(command, args, { stdio: "inherit", ...opts });
}

function git(args, opts = {}) {
  run("git", args, opts);
}

function gh(args, opts = {}) {
  run("gh", args, opts);
}

const index = matter(await fs.readFile(indexPath, "utf8"));
const title = index.data.title ?? folderName;
const summary = index.data.summary ?? "";



await fs.writeFile(
  path.join(contentPath, "README.md"),
  `# ${title}

${summary}
`,
);

const description = (summary || title || folderName)
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 350);

try {
  gh(["repo", "view", `${org}/${repoName}`]);
  console.log(`GitHub repo ${org}/${repoName} already exists.`);
} catch {
  gh([
    "repo",
    "create",
    `${org}/${repoName}`,
    "--public",
    "--description",
    description,
  ]);
}
git(["init", "-b", branch], { cwd: contentPath });
git(["add", "."], { cwd: contentPath });
git(["commit", "-m", `Initial import of ${title}`], { cwd: contentPath });
git(["remote", "add", "origin", repoSshUrl], { cwd: contentPath });
git(["push", "-u", "origin", branch], { cwd: contentPath });

// remove folder from parent git index, but keep files on disk
try {
  git(["rm", "-r", "--cached", contentPath]);
} catch {
  console.warn(`${contentPath} was not tracked in parent repo; continuing.`);
}

// register existing folder as submodule
await fs.writeFile(
  ".gitmodules",
  `${await fs.readFile(".gitmodules", "utf8").catch(() => "")}
[submodule "${contentPath}"]
	path = ${contentPath}
	url = ${repoSshUrl}
	branch = ${branch}
`
);

git(["add", ".gitmodules", contentPath]);
git(["commit", "-m", `Extract ${type}/${folderName} as submodule`]);

console.log(`Done: ${contentPath} -> ${repoSshUrl}`);