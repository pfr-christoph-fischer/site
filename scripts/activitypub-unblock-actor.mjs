import { initializeStorage, unblockActor } from "../backend/lib/storage.mjs";

const actorIndex = process.argv.indexOf("--actor");
const actorId = actorIndex >= 0 ? process.argv[actorIndex + 1] : null;

if (!actorId) {
  console.error("Usage: node scripts/activitypub-unblock-actor.mjs --actor https://example.social/users/name");
  process.exit(1);
}

initializeStorage();
unblockActor(actorId);
console.log(`Unblocked actor ${actorId}`);
