import fs from "node:fs";
import path from "node:path";

function originToHttps(origin) {
  if (!origin) return null;

  let match = origin.match(/^git@([^:]+):(.+)$/);
  if (match) {
    return `https://${match[1]}/${match[2].replace(/\.git$/, "")}`;
  }

  match = origin.match(/^ssh:\/\/git@([^/]+)\/(.+)$/);
  if (match) {
    return `https://${match[1]}/${match[2].replace(/\.git$/, "")}`;
  }

  if (origin.startsWith("https://")) {
    return origin.replace(/\.git$/, "");
  }

  return null;
}

function originProvider(origin) {
  if (!origin) return null;

  if (origin.includes("github.com")) return "GitHub";
  if (origin.includes("codeberg.org")) return "Codeberg";

  return null;
}

function getOriginUrl(data) {
  let dir = path.dirname(data.page.inputPath);

  while (dir && dir !== "." && dir !== path.dirname(dir)) {
    const gitPath = path.join(dir, ".git");

    if (fs.existsSync(gitPath)) {
      let configPath = path.join(gitPath, "config");

      if (fs.statSync(gitPath).isFile()) {
        const gitFile = fs.readFileSync(gitPath, "utf8");
        const match = gitFile.match(/^gitdir:\s*(.+)$/m);
        if (!match) return null;

        const gitDir = path.resolve(dir, match[1].trim());
        configPath = path.join(gitDir, "config");
      }

      if (!fs.existsSync(configPath)) return null;

      const config = fs.readFileSync(configPath, "utf8");

      const originMatch = config.match(
        /\[remote "origin"\][\s\S]*?\n\s*url\s*=\s*(.+)/
      );

      return originMatch ? originMatch[1].trim() : null;
    }

    dir = path.dirname(dir);
  }

  return null;
}

const repositoryCache = new Map();

function getRepositoryInfo(data) {
  const inputPath = data.page?.inputPath;
  if (!inputPath) {
    return {
      repository: null,
      repositoryProvider: null,
    };
  }

  const dir = path.dirname(inputPath);

  if (repositoryCache.has(dir)) {
    return repositoryCache.get(dir);
  }

  const origin = getOriginUrl(data);

  const info = {
    repository: originToHttps(origin),
    repositoryProvider: originProvider(origin),
  };

  repositoryCache.set(dir, info);

  return info;
}

export default {
  eleventyComputed: {
    repository: (data) => {
        return data.repository_url || getRepositoryInfo(data).repository;
    },
    repositoryProvider: (data) => {
        return data.repository_provider || getRepositoryInfo(data).repositoryProvider;
    },
    license: (data) => data.license || 'CC-BY-SA 4.0',
    license_url: (data) => data.license_url || 'https://creativecommons.org/licenses/by-sa/4.0/deed.de',
    licenseUrl: (data) => data.license_url || 'https://creativecommons.org/licenses/by-sa/4.0/deed.de',
  },
};
