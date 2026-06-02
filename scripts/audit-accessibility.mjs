import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer");

const rootDir = process.cwd();
const siteRoot = path.join(rootDir, "_site");
const sitemapPath = path.join(siteRoot, "sitemap.xml");
const pa11yConfigPath = path.join(rootDir, ".pa11yci.cjs");
const isFullRun = process.argv.includes("--full");

const exactSamplePaths = [
  "/",
  "/predigten/",
  "/blog/",
  "/material/",
  "/material/schule/",
  "/open-source/",
  "/galerie/",
  "/podcasts/",
  "/ueber-mich/",
  "/impressum/",
  "/datenschutz/",
  "/suche/"
];

const routeGroups = [
  { pattern: /^\/predigten\/\d{4}\/[^/]+\/$/, limit: 3, sort: "desc" },
  { pattern: /^\/blog\/\d{4}\/[^/]+\/$/, limit: 2, sort: "desc" },
  { pattern: /^\/material\/(?!schule\/)[^/]+\/$/, limit: 2, sort: "asc" },
  { pattern: /^\/open-source\/[^/]+\/$/, limit: 2, sort: "asc" },
  { pattern: /^\/galerie\/[^/]+\/$/, limit: 2, sort: "asc" },
  { pattern: /^\/podcast\/[^/]+\/$/, limit: 2, sort: "asc" },
  { pattern: /^\/podcast\/[^/]+\/[^/]+\/$/, limit: 2, sort: "asc" }
];

const axeTags = ["wcag2a", "wcag21a", "wcag2aa", "wcag21aa", "wcag22aa", "wcag2aaa"];
const chromeLaunchArgs = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-crash-reporter",
  "--disable-breakpad"
];

function ensureBuiltSite() {
  if (!fs.existsSync(siteRoot)) {
    throw new Error("Missing _site/ output. Run the Eleventy build before accessibility audits.");
  }
  if (!fs.existsSync(sitemapPath)) {
    throw new Error("Missing _site/sitemap.xml. Accessibility audits need the generated sitemap.");
  }
}

function parseSitemapUrls() {
  const xml = fs.readFileSync(sitemapPath, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".xml") return "application/xml; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function collectHtmlFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectHtmlFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

function sortPaths(paths, direction) {
  return [...paths].sort((left, right) => direction === "desc" ? right.localeCompare(left) : left.localeCompare(right));
}

function buildSamplePaths(urls) {
  const paths = [...new Set(urls.map((entry) => new URL(entry).pathname))];
  const selected = new Set();

  for (const exactPath of exactSamplePaths) {
    if (paths.includes(exactPath)) {
      selected.add(exactPath);
    }
  }

  for (const group of routeGroups) {
    const matches = sortPaths(paths.filter((entry) => group.pattern.test(entry)), group.sort).slice(0, group.limit);
    for (const match of matches) {
      selected.add(match);
    }
  }

  return [...selected];
}

function pathToSiteFile(sitePath) {
  if (sitePath === "/") {
    return path.join(siteRoot, "index.html");
  }
  return path.join(siteRoot, sitePath.replace(/^\/+/, ""), "index.html");
}

function resolveRequestPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const relativePath = normalized.replace(/^[/\\]+/, "");
  const directPath = path.join(siteRoot, relativePath);

  if (decoded.endsWith("/")) {
    return path.join(directPath, "index.html");
  }
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }
  const nestedIndex = path.join(directPath, "index.html");
  if (fs.existsSync(nestedIndex) && fs.statSync(nestedIndex).isFile()) {
    return nestedIndex;
  }
  return directPath;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const requestPath = resolveRequestPath(req.url || "/");
    if (!requestPath.startsWith(siteRoot) || !fs.existsSync(requestPath) || !fs.statSync(requestPath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": getMimeType(requestPath) });
    fs.createReadStream(requestPath).pipe(res);
  });
}

function createCommandEnv() {
  const pathEntries = [
    path.join(rootDir, "node_modules", ".bin"),
    path.dirname(process.execPath),
    process.env.PATH || ""
  ].filter(Boolean);
  return {
    ...process.env,
    PATH: pathEntries.join(":")
  };
}

function findChromePath() {
  for (const key of ["A11Y_CHROME_PATH", "PUPPETEER_EXECUTABLE_PATH", "CHROME_PATH"]) {
    if (process.env[key] && fs.existsSync(process.env[key])) {
      return process.env[key];
    }
  }
  const shellLookup = spawnSync("bash", [
    "-lc",
    "command -v google-chrome-stable || command -v google-chrome || command -v chromium || command -v chromium-browser"
  ], {
    cwd: rootDir,
    env: createCommandEnv(),
    encoding: "utf8"
  });
  if (shellLookup.status === 0) {
    const shellPath = shellLookup.stdout.trim();
    if (shellPath && fs.existsSync(shellPath)) {
      return shellPath;
    }
  }
  return null;
}

async function startServerIfPossible() {
  const server = createStaticServer();
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch {
    server.close();
    return null;
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    return null;
  }

  return {
    server,
    origin: `http://127.0.0.1:${address.port}`
  };
}

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: {
        ...createCommandEnv(),
        ...extraEnv
      },
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

async function runPa11yAudit(sitemapUrls, origin) {
  const pa11yCiBin = path.join(rootDir, "node_modules", ".bin", "pa11y-ci");
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error("Could not find a Chrome or Chromium executable. Set A11Y_CHROME_PATH or install a browser before running accessibility audits.");
  }
  const pa11yEnv = {
    A11Y_CHROME_PATH: chromePath,
    CHROME_PATH: chromePath,
    PUPPETEER_EXECUTABLE_PATH: chromePath
  };
  if (isFullRun && origin) {
    const productionOrigin = new URL(sitemapUrls[0]).origin;
    console.log(`Running pa11y-ci against the full sitemap via ${origin}/sitemap.xml`);
    await runCommand(pa11yCiBin, [
      "--config",
      pa11yConfigPath,
      "--sitemap",
      `${origin}/sitemap.xml`,
      "--sitemap-find",
      productionOrigin,
      "--sitemap-replace",
      origin
    ], pa11yEnv);
    return buildSamplePaths(sitemapUrls);
  }

  if (isFullRun) {
    const htmlFiles = collectHtmlFiles(siteRoot).sort((left, right) => left.localeCompare(right));
    console.log(`Running pa11y-ci against ${htmlFiles.length} generated HTML files`);
    await runCommand(pa11yCiBin, [
      "--config",
      pa11yConfigPath,
      ...htmlFiles
    ], pa11yEnv);
    return buildSamplePaths(sitemapUrls);
  }

  const samplePaths = buildSamplePaths(sitemapUrls);
  const sampleTargets = origin
    ? samplePaths.map((sitePath) => `${origin}${sitePath}`)
    : samplePaths.map(pathToSiteFile).filter((filePath) => fs.existsSync(filePath));
  console.log(`Running pa11y-ci against ${sampleTargets.length} representative pages`);
  await runCommand(pa11yCiBin, ["--config", pa11yConfigPath, ...sampleTargets], pa11yEnv);
  return samplePaths;
}

function summarizeNodeTarget(node) {
  if (Array.isArray(node?.target) && node.target.length) {
    return node.target.join(" ");
  }
  return node?.html || "<unknown>";
}

async function runAxeAudit(samplePaths, origin) {
  const chromePath = findChromePath();
  const sampleUrls = origin
    ? samplePaths.map((sitePath) => `${origin}${sitePath}`)
    : samplePaths
      .map(pathToSiteFile)
      .filter((filePath) => fs.existsSync(filePath))
      .map((filePath) => pathToFileURL(filePath).href);

  if (!chromePath) {
    throw new Error("Could not find a Chrome or Chromium executable. Set A11Y_CHROME_PATH or install a browser before running accessibility audits.");
  }

  console.log(`Running axe-core against ${sampleUrls.length} representative pages`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: chromeLaunchArgs
  });

  const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const failures = [];

  try {
    for (const url of sampleUrls) {
      const page = await browser.newPage();
      try {
        await page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 60000
        });
        await page.addScriptTag({ content: axeSource });
        const results = await page.evaluate((tags) => {
          return window.axe.run(document, {
            runOnly: {
              type: "tag",
              values: tags
            }
          });
        }, axeTags);

        if (results.violations.length) {
          failures.push({
            url,
            violations: results.violations.map((violation) => ({
              id: violation.id,
              help: violation.help,
              nodes: violation.nodes.map((node) => summarizeNodeTarget(node))
            }))
          });
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    for (const failure of failures) {
      console.error(`\nAxe violations in ${failure.url}:`);
      for (const violation of failure.violations) {
        console.error(`\n - ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes.slice(0, 5)) {
          console.error(`   ${node}`);
        }
        if (violation.nodes.length > 5) {
          console.error(`   ...and ${violation.nodes.length - 5} more`);
        }
      }
    }
    throw new Error(`axe-core found violations on ${failures.length} page(s).`);
  }
}

async function main() {
  ensureBuiltSite();
  const sitemapUrls = parseSitemapUrls();
  if (!sitemapUrls.length) {
    throw new Error("The generated sitemap does not contain any URLs to audit.");
  }

  const auditServer = await startServerIfPossible();
  try {
    const samplePaths = await runPa11yAudit(sitemapUrls, auditServer?.origin || null);
    await runAxeAudit(samplePaths, auditServer?.origin || null);
    console.log(`Accessibility audits passed (${isFullRun ? "full pa11y crawl" : "representative route set"}).`);
  } finally {
    if (auditServer?.server) {
      await new Promise((resolve, reject) => auditServer.server.close((error) => error ? reject(error) : resolve()));
    }
  }
}

await main();
