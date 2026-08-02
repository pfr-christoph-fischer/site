import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const ccBySa40TemplatePath = path.resolve(
  scriptDir,
  "..",
  "templates",
  "licenses",
  "CC-BY-SA-4.0.txt"
);

export function getCcBySa40TemplatePath() {
  return ccBySa40TemplatePath;
}

export function writeCcBySa40LicenseFile(targetDir) {
  const licensePath = path.join(targetDir, "LICENSE");
  fs.copyFileSync(ccBySa40TemplatePath, licensePath);
  return licensePath;
}
