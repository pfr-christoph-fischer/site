import { config } from "../backend/lib/config.mjs";
import { buildCreateActivity, deliverActivityToFollowers } from "../backend/lib/activitypub.mjs";
import { getPublishedSermons } from "../backend/lib/content.mjs";
import { initializeStorage, readPublished, writePublished } from "../backend/lib/storage.mjs";

function shouldFederate(item) {
  if (item.federate === false || item.index === false || item.draft === true) return false;
  const publishDate = new Date(item.date);
  return !Number.isNaN(publishDate.getTime()) && publishDate <= new Date();
}

async function main() {
  initializeStorage();
  const published = readPublished();
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
    const deliveryResults = await deliverActivityToFollowers(activity);

    published[item.url] = {
      activityId: activity.id,
      publishedAt: new Date().toISOString(),
      deliveries: deliveryResults
    };
    writePublished(published);
    console.log(`Federated ${item.url} to ${deliveryResults.length} followers`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
