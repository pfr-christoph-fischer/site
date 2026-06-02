import { initializeStorage, removeFollower } from "../backend/lib/storage.mjs";

const actorIndex = process.argv.indexOf("--actor");
const actorId = actorIndex >= 0 ? process.argv[actorIndex + 1] : null;

if (!actorId) {
  console.error("Usage: node scripts/activitypub-remove-follower.mjs --actor https://example.social/users/name");
  process.exit(1);
}

initializeStorage();
removeFollower(actorId);
console.log(`Removed follower ${actorId}`);
