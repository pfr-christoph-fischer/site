import crypto from "node:crypto";
import fs from "node:fs";
import { config } from "./config.mjs";

const privateKey = fs.readFileSync(config.privateKeyPath, "utf8");

export function createDigest(body) {
  return `SHA-256=${crypto.createHash("sha256").update(body).digest("base64")}`;
}

export function createSignedHeaders({ url, method, body, contentType = "application/activity+json" }) {
  const target = new URL(url);
  const date = new Date().toUTCString();
  const digest = createDigest(body);
  const signingString = [
    `(request-target): ${method.toLowerCase()} ${target.pathname}${target.search}`,
    `host: ${target.host}`,
    `date: ${date}`,
    `digest: ${digest}`
  ].join("\n");

  const signature = crypto.createSign("RSA-SHA256").update(signingString).sign(privateKey, "base64");
  const signatureHeader = [
    `keyId="${config.actorId}#main-key"`,
    'algorithm="rsa-sha256"',
    'headers="(request-target) host date digest"',
    `signature="${signature}"`
  ].join(",");

  return {
    Host: target.host,
    Date: date,
    Digest: digest,
    Signature: signatureHeader,
    Accept: "application/activity+json",
    "Content-Type": contentType
  };
}
