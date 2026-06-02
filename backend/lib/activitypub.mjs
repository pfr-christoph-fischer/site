import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "./config.mjs";
import { createSignedHeaders } from "./http-signatures.mjs";
import { appendActivity, appendDelivery, readFollowers } from "./storage.mjs";

export function buildCreateActivity(item) {
  const activityId = `${config.baseUrl}/activity/${item.slug}-${item.date}-${randomUUID()}`;
  const articleId = `${item.url}#activity`;
  const summary = item.summary || `${item.title} auf ${config.baseUrl}`;
  const publishedAt = new Date(`${item.date}T09:00:00Z`).toISOString();
  const content = `<p>Neuer Beitrag: <a href="${item.url}">${item.title}</a></p><p>${summary}</p>`;

  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: activityId,
    type: "Create",
    actor: config.actorId,
    published: publishedAt,
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
      published: publishedAt,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [config.followersId]
    }
  };
}

export async function sendSignedActivity(inbox, activity) {
  const body = JSON.stringify(activity);
  const headers = createSignedHeaders({ url: inbox, method: "POST", body });
  return fetch(inbox, {
    method: "POST",
    headers,
    body
  });
}

export async function deliverActivityToFollower(follower, activity, {
  direction = "outbound-create",
  retries = config.deliveryRetries
} = {}) {
  let attempt = 0;
  let lastResult = null;

  while (attempt <= retries) {
    attempt += 1;
    try {
      const response = await sendSignedActivity(follower.inbox, activity);
      lastResult = {
        activityId: activity.id,
        inbox: follower.inbox,
        actorId: follower.actorId,
        status: response.status,
        ok: response.ok,
        deliveredAt: new Date().toISOString(),
        direction,
        attempts: attempt,
        nextRetryAt: !response.ok && attempt <= retries
          ? new Date(Date.now() + config.deliveryRetryDelayMs).toISOString()
          : null
      };
      appendDelivery(lastResult);
      if (response.ok || attempt > retries) {
        return lastResult;
      }
    } catch (error) {
      lastResult = {
        activityId: activity.id,
        inbox: follower.inbox,
        actorId: follower.actorId,
        status: null,
        ok: false,
        error: error.message,
        deliveredAt: new Date().toISOString(),
        direction,
        attempts: attempt,
        nextRetryAt: attempt <= retries
          ? new Date(Date.now() + config.deliveryRetryDelayMs).toISOString()
          : null
      };
      appendDelivery(lastResult);
      if (attempt > retries) {
        return lastResult;
      }
    }

    await delay(config.deliveryRetryDelayMs);
  }

  return lastResult;
}

export async function deliverActivityToFollowers(activity, options = {}) {
  appendActivity(activity);
  const followers = readFollowers().filter((item) => item.inbox);
  const results = [];

  for (const follower of followers) {
    results.push(await deliverActivityToFollower(follower, activity, options));
  }

  return results;
}
