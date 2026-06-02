const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function fromEnv() {
  for (const key of ["A11Y_CHROME_PATH", "PUPPETEER_EXECUTABLE_PATH", "CHROME_PATH"]) {
    if (process.env[key] && fs.existsSync(process.env[key])) {
      return process.env[key];
    }
  }
  return null;
}

function fromShell() {
  try {
    const output = execFileSync("bash", [
      "-lc",
      "command -v google-chrome-stable || command -v google-chrome || command -v chromium || command -v chromium-browser"
    ], { encoding: "utf8" }).trim();
    return output || null;
  } catch {
    return null;
  }
}

function fromPuppeteerCache() {
  const cacheRoot = path.join(process.env.HOME || "", ".cache", "puppeteer");
  if (!cacheRoot || !fs.existsSync(cacheRoot)) {
    return null;
  }
  const candidates = [
    path.join(cacheRoot, "chrome", "linux-*/chrome-linux64/chrome"),
    path.join(cacheRoot, "chrome-headless-shell", "linux-*/chrome-headless-shell-linux64/chrome-headless-shell")
  ];
  for (const pattern of candidates) {
    const [baseDir, tail] = pattern.split("*");
    if (!fs.existsSync(baseDir)) continue;
    for (const entry of fs.readdirSync(baseDir)) {
      const candidate = path.join(baseDir, entry, tail.replace(/^\//, ""));
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

const chromeExecutablePath = fromEnv() || fromShell() || fromPuppeteerCache();

module.exports = {
  defaults: {
    standard: "WCAG2AAA",
    runners: ["htmlcs"],
    ignore: [
      "WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail",
      "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
      "WCAG2AAA.Principle1.Guideline1_4.1_4_6.G18.Fail"
    ],
    timeout: 60000,
    wait: 500,
    concurrency: 1,
    useIncognitoBrowserContext: false,
    chromeLaunchConfig: {
      ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-crash-reporter",
        "--disable-breakpad"
      ]
    }
  }
};
