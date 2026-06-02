import { deliverActivityToFollower } from "../backend/lib/activitypub.mjs";
import { getActivityById, initializeStorage, readDeliveries } from "../backend/lib/storage.mjs";

initializeStorage();

const retryEntries = readDeliveries({ onlyFailed: true, dueOnly: true, limit: 25 });
if (!retryEntries.length) {
  console.log("No failed deliveries are due for retry.");
  process.exit(0);
}

for (const entry of retryEntries) {
  if (!entry.activityId || !entry.actorId || !entry.inbox) {
    continue;
  }
  const activity = getActivityById(entry.activityId);
  if (!activity) {
    console.log(`Skipping ${entry.activityId}: activity not found`);
    continue;
  }
  const result = await deliverActivityToFollower({
    actorId: entry.actorId,
    inbox: entry.inbox
  }, activity, {
    direction: "retry-delivery"
  });
  console.log(`${result.ok ? "Retried" : "Failed"} ${entry.activityId} -> ${entry.inbox}`);
}
