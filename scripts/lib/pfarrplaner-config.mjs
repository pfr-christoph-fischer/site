import { loadEnv } from "./env.mjs";

function splitList(rawValue) {
  return String(rawValue)
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeHost(host) {
  return String(host)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");
}

function parseEnvInstances(rawValue) {
  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error(
      "Invalid PFARRPLANER_INSTANCES value. Use a single-line JSON array of objects with host and token fields."
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("PFARRPLANER_INSTANCES must be a non-empty JSON array.");
  }

  return parsed.map((host) => {
    if (!host || typeof host !== "object" || !host.host || !host.token) {
      throw new Error("Each PFARRPLANER_INSTANCES entry requires host and token fields.");
    }
    return {
      host: normalizeHost(host.host),
      token: String(host.token).trim()
    };
  });
}

export function loadPfarrplanerHosts(projectRoot) {
  loadEnv(projectRoot);

  const rawValue = process.env.PFARRPLANER_INSTANCES;
  if (!rawValue) {
    throw new Error(
      "Missing Pfarrplaner configuration. Set PFARRPLANER_INSTANCES in .env as a single-line JSON array."
    );
  }

  return parseEnvInstances(rawValue);
}
