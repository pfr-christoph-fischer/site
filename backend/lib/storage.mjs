import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

function ensureDataDir() {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

function filePath(name) {
  ensureDataDir();
  return path.join(config.dataDir, name);
}

function readJson(name, fallback) {
  const target = filePath(name);
  if (!fs.existsSync(target)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function writeJson(name, value) {
  fs.writeFileSync(filePath(name), JSON.stringify(value, null, 2));
}

export function readFollowers() {
  return readJson("followers.json", []);
}

export function writeFollowers(value) {
  writeJson("followers.json", value);
}

export function readActivities() {
  return readJson("activities.json", []);
}

export function writeActivities(value) {
  writeJson("activities.json", value);
}

export function readPublished() {
  return readJson("published.json", {});
}

export function writePublished(value) {
  writeJson("published.json", value);
}

export function readDeliveries() {
  return readJson("deliveries.json", []);
}

export function writeDeliveries(value) {
  writeJson("deliveries.json", value);
}

export function appendDelivery(entry) {
  const deliveries = readDeliveries();
  deliveries.push(entry);
  writeDeliveries(deliveries);
}

export function appendActivity(entry) {
  const activities = readActivities();
  activities.push(entry);
  writeActivities(activities);
}
