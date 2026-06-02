import fs from "node:fs";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { config } from "./lib/config.mjs";
import { createDigest, createSignedHeaders, parseSignatureHeader, verifyHttpSignature } from "./lib/http-signatures.mjs";
import { appendActivity, appendDelivery, countActivities, countFollowers, getActivityById, getRemoteActorByActorId, getRemoteActorByKeyId, initializeStorage, isActorBlocked, readActivities, readFollowers, removeFollower, upsertFollower, upsertRemoteActor } from "./lib/storage.mjs";

const publicKeyPem = fs.readFileSync(config.publicKeyPath, "utf8");
const rateLimitBuckets = new Map();

initializeStorage();

function sendJson(res, statusCode, data, contentType = "application/activity+json; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(JSON.stringify(data, null, 2));
}

function notFound(res) {
  sendJson(res, 404, { error: "Not found" }, "application/json; charset=utf-8");
}

function actor() {
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: config.actorId,
    type: "Person",
    preferredUsername: config.username,
    name: config.displayName,
    summary: config.summary,
    url: config.websiteUrl,
    inbox: config.inboxId,
    outbox: config.outboxId,
    followers: config.followersId,
    following: config.followingId,
    featured: config.featuredId,
    publicKey: {
      id: `${config.actorId}#main-key`,
      owner: config.actorId,
      publicKeyPem
    },
    icon: {
      type: "Image",
      mediaType: "image/jpeg",
      url: config.iconUrl
    },
    image: {
      type: "Image",
      mediaType: "image/jpeg",
      url: config.imageUrl
    }
  };
}

async function readRequestBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > config.requestBodyLimit) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchActorDetails(actorUrl) {
  const response = await fetch(actorUrl, {
    headers: {
      Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    }
  });
  if (!response.ok) {
    throw new Error(`Could not fetch actor ${actorUrl}: ${response.status}`);
  }
  return response.json();
}

function collectionPageData({ pathname, page, totalItems, pageSize }) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(Number(page || 1), 1), pageCount);
  const first = `${config.baseUrl}${pathname}?page=1`;
  const last = `${config.baseUrl}${pathname}?page=${pageCount}`;
  const prev = currentPage > 1 ? `${config.baseUrl}${pathname}?page=${currentPage - 1}` : null;
  const next = currentPage < pageCount ? `${config.baseUrl}${pathname}?page=${currentPage + 1}` : null;
  return { pageCount, currentPage, first, last, prev, next };
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function enforceRateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const windowStart = now - config.rateLimitWindowMs;
  const timestamps = (rateLimitBuckets.get(ip) || []).filter((timestamp) => timestamp >= windowStart);
  timestamps.push(now);
  rateLimitBuckets.set(ip, timestamps);
  return timestamps.length <= config.rateLimitMaxRequests;
}

async function getRemoteActorRecord(actorUrl, keyId = null) {
  const cached = (keyId && getRemoteActorByKeyId(keyId)) || getRemoteActorByActorId(actorUrl);
  if (cached?.publicKey) {
    return cached;
  }

  const details = await fetchActorDetails(actorUrl);
  const record = {
    actorId: details.id || actorUrl,
    preferredUsername: details.preferredUsername || null,
    displayName: details.name || null,
    inbox: details.inbox || null,
    publicKey: details.publicKey?.publicKeyPem || null,
    keyId: details.publicKey?.id || keyId || null,
    fetchedAt: new Date().toISOString(),
    payload: details
  };
  upsertRemoteActor(record);
  return record;
}

async function verifyInboxRequest(req, url, raw, activity) {
  if (!config.inboxRequireSignature) {
    return getRemoteActorRecord(activity.actor);
  }

  const signatureHeader = req.headers.signature;
  if (!signatureHeader) {
    throw new Error("Missing Signature header");
  }

  const dateHeader = req.headers.date;
  if (!dateHeader) {
    throw new Error("Missing Date header");
  }
  const signatureAgeMs = Math.abs(Date.now() - new Date(dateHeader).getTime());
  if (!Number.isFinite(signatureAgeMs) || signatureAgeMs > config.signatureMaxAgeSeconds * 1000) {
    throw new Error("Signature date is outside the accepted window");
  }

  const expectedDigest = createDigest(raw);
  if (req.headers.digest !== expectedDigest) {
    throw new Error("Digest verification failed");
  }

  const parsed = parseSignatureHeader(signatureHeader);
  const remoteActor = await getRemoteActorRecord(activity.actor, parsed.keyId || null);
  if (!remoteActor?.publicKey) {
    throw new Error("Remote actor public key unavailable");
  }
  if (remoteActor.actorId !== activity.actor) {
    throw new Error("Signature actor does not match activity actor");
  }

  const verified = verifyHttpSignature({
    method: req.method || "POST",
    url,
    headers: req.headers,
    signatureHeader,
    publicKey: remoteActor.publicKey
  });
  if (!verified) {
    throw new Error("HTTP signature verification failed");
  }

  return remoteActor;
}

async function handleFollow(activity, remoteActor = null) {
  const details = remoteActor || await getRemoteActorRecord(activity.actor);
  const entry = {
    actorId: activity.actor,
    preferredUsername: details.preferredUsername || details.payload?.preferredUsername || null,
    displayName: details.displayName || details.payload?.name || null,
    inbox: details.inbox || null,
    publicKey: details.publicKey || null,
    keyId: details.keyId || details.payload?.publicKey?.id || null,
    followedAt: new Date().toISOString()
  };
  upsertFollower(entry);
  const acceptActivity = {
    id: `${config.baseUrl}/activity/${randomUUID()}`,
    type: "Accept",
    actor: config.actorId,
    object: activity,
    published: new Date().toISOString()
  };
  appendActivity(acceptActivity);

  if (entry.inbox) {
    const body = JSON.stringify({
      "@context": "https://www.w3.org/ns/activitystreams",
      ...acceptActivity
    });
    try {
      const headers = createSignedHeaders({ url: entry.inbox, method: "POST", body });
      const response = await fetch(entry.inbox, {
        method: "POST",
        headers,
        body
      });
      appendDelivery({
        activityId: acceptActivity.id,
        inbox: entry.inbox,
        actorId: entry.actorId,
        status: response.status,
        ok: response.ok,
        deliveredAt: new Date().toISOString(),
        direction: "outbound-accept"
      });
    } catch (error) {
      appendDelivery({
        activityId: acceptActivity.id,
        inbox: entry.inbox,
        actorId: entry.actorId,
        status: null,
        ok: false,
        error: error.message,
        deliveredAt: new Date().toISOString(),
        direction: "outbound-accept"
      });
    }
  }
}

function handleUndo(activity) {
  if (activity.object?.type !== "Follow") {
    return;
  }
  removeFollower(activity.actor);
}

async function requestHandler(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/.well-known/webfinger") {
    const resource = url.searchParams.get("resource");
    if (!config.actorHandleAliases.includes(resource)) {
      sendJson(res, 400, { error: `Invalid resource ${resource}` }, "application/json; charset=utf-8");
      return;
    }
    sendJson(res, 200, {
      subject: config.actorHandle,
      aliases: [config.actorId],
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: config.actorId
        }
      ]
    }, "application/jrd+json; charset=utf-8");
    return;
  }

  if (req.method === "GET" && url.pathname === `/users/${config.username}`) {
    sendJson(res, 200, actor());
    return;
  }

  if (req.method === "GET" && url.pathname === `/users/${config.username}/followers`) {
    const totalItems = countFollowers();
    const page = Number(url.searchParams.get("page") || 0);
    if (page > 0) {
      const { currentPage, prev, next } = collectionPageData({
        pathname: `/users/${config.username}/followers`,
        page,
        totalItems,
        pageSize: config.collectionPageSize
      });
      const followers = readFollowers({
        limit: config.collectionPageSize,
        offset: (currentPage - 1) * config.collectionPageSize
      });
      sendJson(res, 200, {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${config.followersId}?page=${currentPage}`,
        type: "OrderedCollectionPage",
        partOf: config.followersId,
        prev,
        next,
        orderedItems: followers.map((item) => item.actorId)
      });
      return;
    }
    const pageData = collectionPageData({
      pathname: `/users/${config.username}/followers`,
      page: 1,
      totalItems,
      pageSize: config.collectionPageSize
    });
    sendJson(res, 200, {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: config.followersId,
      type: "OrderedCollection",
      totalItems,
      first: pageData.first,
      last: pageData.last
    });
    return;
  }

  if (req.method === "GET" && url.pathname === `/users/${config.username}/following`) {
    sendJson(res, 200, {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: config.followingId,
      type: "OrderedCollection",
      totalItems: 0,
      orderedItems: []
    });
    return;
  }

  if (req.method === "GET" && url.pathname === `/users/${config.username}/featured`) {
    sendJson(res, 200, {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: config.featuredId,
      type: "OrderedCollection",
      totalItems: 0,
      orderedItems: []
    });
    return;
  }

  if (req.method === "GET" && url.pathname === `/users/${config.username}/outbox`) {
    const totalItems = countActivities();
    const page = Number(url.searchParams.get("page") || 0);
    if (page > 0) {
      const { currentPage, prev, next } = collectionPageData({
        pathname: `/users/${config.username}/outbox`,
        page,
        totalItems,
        pageSize: config.collectionPageSize
      });
      const activities = readActivities({
        limit: config.collectionPageSize,
        offset: (currentPage - 1) * config.collectionPageSize
      });
      sendJson(res, 200, {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${config.outboxId}?page=${currentPage}`,
        type: "OrderedCollectionPage",
        partOf: config.outboxId,
        prev,
        next,
        orderedItems: activities
      });
      return;
    }
    const pageData = collectionPageData({
      pathname: `/users/${config.username}/outbox`,
      page: 1,
      totalItems,
      pageSize: config.collectionPageSize
    });
    sendJson(res, 200, {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: config.outboxId,
      type: "OrderedCollection",
      totalItems,
      first: pageData.first,
      last: pageData.last
    });
    return;
  }

  if (req.method === "POST" && url.pathname === `/users/${config.username}/inbox`) {
    try {
      if (!enforceRateLimit(req)) {
        sendJson(res, 429, { error: "Rate limit exceeded" }, "application/json; charset=utf-8");
        return;
      }
      const raw = await readRequestBody(req);
      const activity = JSON.parse(raw);
      if (!activity?.type || !activity?.actor) {
        sendJson(res, 400, { error: "Invalid activity" }, "application/json; charset=utf-8");
        return;
      }
      if (isActorBlocked(activity.actor)) {
        sendJson(res, 403, { error: "Actor is blocked" }, "application/json; charset=utf-8");
        return;
      }
      const remoteActor = await verifyInboxRequest(req, url, raw, activity);
      if (activity.type === "Follow") {
        await handleFollow(activity, remoteActor);
      } else if (activity.type === "Undo") {
        handleUndo(activity);
      }
      sendJson(res, 200, { message: "Activity processed" }, "application/json; charset=utf-8");
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to process activity" }, "application/json; charset=utf-8");
      return;
    }
  }

  if (req.method === "GET" && url.pathname.startsWith("/activity/")) {
    const activity = getActivityById(`${config.baseUrl}${url.pathname}`);
    if (!activity) {
      notFound(res);
      return;
    }
    sendJson(res, 200, activity);
    return;
  }

  notFound(res);
}

const server = http.createServer((req, res) => {
  requestHandler(req, res).catch((error) => {
    sendJson(res, 500, { error: error.message || "Internal server error" }, "application/json; charset=utf-8");
  });
});

server.listen(config.port, config.host, () => {
  console.log(`ActivityPub backend listening on http://${config.host}:${config.port}`);
});
