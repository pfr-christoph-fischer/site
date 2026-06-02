import crypto from "node:crypto";
import fs from "node:fs";
import { config } from "./config.mjs";

const privateKey = fs.readFileSync(config.privateKeyPath, "utf8");

export function createDigest(body) {
  return `SHA-256=${crypto.createHash("sha256").update(body).digest("base64")}`;
}

export function parseSignatureHeader(header) {
  const result = {};
  for (const match of String(header || "").matchAll(/([a-zA-Z]+)="([^"]*)"/g)) {
    result[match[1]] = match[2];
  }
  return result;
}

function headerValue(headers, name) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : value;
}

export function buildSigningString({ method, pathname, search = "", headers, signedHeaders }) {
  return signedHeaders.map((headerName) => {
    if (headerName === "(request-target)") {
      return `(request-target): ${method.toLowerCase()} ${pathname}${search}`;
    }
    const value = headerValue(headers, headerName);
    if (!value) {
      throw new Error(`Missing signed header ${headerName}`);
    }
    return `${headerName}: ${value}`;
  }).join("\n");
}

export function verifyHttpSignature({ method, url, headers, signatureHeader, publicKey }) {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed.signature || !parsed.headers) {
    throw new Error("Invalid Signature header");
  }
  if (parsed.algorithm && parsed.algorithm.toLowerCase() !== "rsa-sha256") {
    throw new Error(`Unsupported signature algorithm ${parsed.algorithm}`);
  }
  const signedHeaders = parsed.headers.split(/\s+/).filter(Boolean);
  const signingString = buildSigningString({
    method,
    pathname: url.pathname,
    search: url.search,
    headers,
    signedHeaders
  });
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signingString);
  verifier.end();
  return verifier.verify(publicKey, parsed.signature, "base64");
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
