import fs from "node:fs";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { config } from "./lib/config.mjs";
import { createSignedHeaders } from "./lib/http-signatures.mjs";
import { appendActivity, appendDelivery, readActivities, readFollowers, writeFollowers } from "./lib/storage.mjs";

const publicKeyPem = fs.readFileSync(config.publicKeyPath, "utf8");

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

async function handleFollow(activity) {
  const details = await fetchActorDetails(activity.actor);
  const followers = readFollowers();
  const existingIndex = followers.findIndex((item) => item.actorId === activity.actor);
  const entry = {
    actorId: activity.actor,
    preferredUsername: details.preferredUsername || null,
    displayName: details.name || null,
    inbox: details.inbox || null,
    publicKey: details.publicKey?.publicKeyPem || null,
    followedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    followers[existingIndex] = { ...followers[existingIndex], ...entry };
  } else {
    followers.push(entry);
  }
  writeFollowers(followers);
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
  const followers = readFollowers().filter((item) => item.actorId !== activity.actor);
  writeFollowers(followers);
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
    const followers = readFollowers();
    sendJson(res, 200, {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: config.followersId,
      type: "OrderedCollection",
      totalItems: followers.length,
      orderedItems: followers.map((item) => item.actorId)
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
    const activities = readActivities().sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
    sendJson(res, 200, {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: config.outboxId,
      type: "OrderedCollection",
      totalItems: activities.length,
      orderedItems: activities
    });
    return;
  }

  if (req.method === "POST" && url.pathname === `/users/${config.username}/inbox`) {
    try {
      const raw = await readRequestBody(req);
      const activity = JSON.parse(raw);
      if (!activity?.type || !activity?.actor) {
        sendJson(res, 400, { error: "Invalid activity" }, "application/json; charset=utf-8");
        return;
      }
      if (activity.type === "Follow") {
        await handleFollow(activity);
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
