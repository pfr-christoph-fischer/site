import { randomUUID } from "node:crypto";
import { config } from "../backend/lib/config.mjs";
import { getPublishedSermons } from "../backend/lib/content.mjs";
import { createSignedHeaders } from "../backend/lib/http-signatures.mjs";
import { appendActivity, appendDelivery, readFollowers, readPublished, writePublished } from "../backend/lib/storage.mjs";

function shouldFederate(item) {
  if (item.federate === false || item.index === false || item.draft === true) return false;
  const publishDate = new Date(item.date);
  return !Number.isNaN(publishDate.getTime()) && publishDate <= new Date();
}

function buildCreateActivity(item) {
  const activityId = `${config.baseUrl}/activity/${item.slug}-${item.date}-${randomUUID()}`;
  const articleId = `${item.url}#activity`;
  const summary = item.summary || `${item.title} auf ${config.baseUrl}`;
  const content = `<p>Neuer Beitrag: <a href="${item.url}">${item.title}</a></p><p>${summary}</p>`;
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: activityId,
    type: "Create",
    actor: config.actorId,
    published: new Date(`${item.date}T09:00:00Z`).toISOString(),
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [config.followersId],
    object: {
      id: articleId,
      type: "Article",
      attributedTo: config.actorId,
      name: item.title,
      summary,
      content,
      url: item.url,
      published: new Date(`${item.date}T09:00:00Z`).toISOString(),
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [config.followersId]
    }
  };
}

async function sendSignedActivity(inbox, activity) {
  const body = JSON.stringify(activity);
  const headers = createSignedHeaders({ url: inbox, method: "POST", body });
  const response = await fetch(inbox, {
    method: "POST",
    headers,
    body
  });
  return response;
}

async function main() {
  const published = readPublished();
  const followers = readFollowers().filter((item) => item.inbox);
  const candidates = getPublishedSermons().filter(shouldFederate);
  const firstRunMode = process.env.ACTIVITYPUB_BACKFILL || "latest";

  if (Object.keys(published).length === 0 && candidates.length > 1 && firstRunMode !== "all") {
    const newest = candidates[candidates.length - 1];
    for (const item of candidates.slice(0, -1)) {
      published[item.url] = {
        activityId: null,
        publishedAt: new Date().toISOString(),
        seeded: true
      };
    }
    writePublished(published);
    if (firstRunMode === "none") {
      console.log(`Seeded ${candidates.length} existing items without federation`);
      return;
    }
    candidates.length = 0;
    candidates.push(newest);
  }

  for (const item of candidates) {
    if (published[item.url]) {
      continue;
    }

    const activity = buildCreateActivity(item);
    appendActivity(activity);

    const deliveryResults = [];
    for (const follower of followers) {
      try {
        const response = await sendSignedActivity(follower.inbox, activity);
        const result = {
          activityId: activity.id,
          inbox: follower.inbox,
          actorId: follower.actorId,
          status: response.status,
          ok: response.ok,
          deliveredAt: new Date().toISOString()
        };
        appendDelivery(result);
        deliveryResults.push(result);
      } catch (error) {
        const result = {
          activityId: activity.id,
          inbox: follower.inbox,
          actorId: follower.actorId,
          ok: false,
          status: null,
          error: error.message,
          deliveredAt: new Date().toISOString()
        };
        appendDelivery(result);
        deliveryResults.push(result);
      }
    }

    published[item.url] = {
      activityId: activity.id,
      publishedAt: new Date().toISOString(),
      deliveries: deliveryResults
    };
    writePublished(published);
    console.log(`Federated ${item.url} to ${followers.length} followers`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
