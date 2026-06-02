import { blockActor, initializeStorage } from "../backend/lib/storage.mjs";

const actorIndex = process.argv.indexOf("--actor");
const noteIndex = process.argv.indexOf("--note");
const actorId = actorIndex >= 0 ? process.argv[actorIndex + 1] : null;
const note = noteIndex >= 0 ? process.argv[noteIndex + 1] : null;

if (!actorId) {
  console.error("Usage: node scripts/activitypub-block-actor.mjs --actor https://example.social/users/name [--note \"reason\"]");
  process.exit(1);
}

initializeStorage();
blockActor(actorId, note);
console.log(`Blocked actor ${actorId}`);
