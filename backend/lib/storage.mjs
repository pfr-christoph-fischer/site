import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { config } from "./config.mjs";

let initialized = false;

function ensureDataDir() {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(sql, { json = false } = {}) {
  ensureDataDir();
  const args = ["-cmd", ".timeout 5000", ...(json ? ["-json"] : []), config.dbPath, sql];
  const output = execFileSync("sqlite3", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  if (!json) {
    return output;
  }
  return output ? JSON.parse(output) : [];
}

function legacyFilePath(name) {
  return path.join(config.dataDir, name);
}

function readLegacyJson(name, fallback) {
  const target = legacyFilePath(name);
  if (!fs.existsSync(target)) return fallback;
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function tableCount(name) {
  return Number(runSql(`SELECT COUNT(*) FROM ${name};`) || "0");
}

function insertActivityPayload(entry) {
  const payload = JSON.stringify(entry);
  runSql(`
    INSERT OR REPLACE INTO activities (id, type, actor, published, payload)
    VALUES (
      ${sqlValue(entry.id)},
      ${sqlValue(entry.type || null)},
      ${sqlValue(entry.actor || null)},
      ${sqlValue(entry.published || null)},
      ${sqlValue(payload)}
    );
  `);
}

function insertFollowerEntry(entry) {
  runSql(`
    INSERT INTO followers (actor_id, preferred_username, display_name, inbox, public_key, key_id, followed_at)
    VALUES (
      ${sqlValue(entry.actorId)},
      ${sqlValue(entry.preferredUsername || null)},
      ${sqlValue(entry.displayName || null)},
      ${sqlValue(entry.inbox || null)},
      ${sqlValue(entry.publicKey || null)},
      ${sqlValue(entry.keyId || null)},
      ${sqlValue(entry.followedAt || new Date().toISOString())}
    )
    ON CONFLICT(actor_id) DO UPDATE SET
      preferred_username = excluded.preferred_username,
      display_name = excluded.display_name,
      inbox = excluded.inbox,
      public_key = excluded.public_key,
      key_id = excluded.key_id,
      followed_at = excluded.followed_at;
  `);
}

function insertPublishedEntry(url, entry) {
  runSql(`
    INSERT OR REPLACE INTO published (url, activity_id, published_at, seeded, payload)
    VALUES (
      ${sqlValue(url)},
      ${sqlValue(entry.activityId || null)},
      ${sqlValue(entry.publishedAt || null)},
      ${sqlValue(entry.seeded ? 1 : 0)},
      ${sqlValue(JSON.stringify(entry))}
    );
  `);
}

function insertDeliveryEntry(entry) {
  runSql(`
    INSERT INTO deliveries (
      activity_id, inbox, actor_id, status, ok, error, delivered_at, direction, attempts, next_retry_at, payload
    ) VALUES (
      ${sqlValue(entry.activityId || null)},
      ${sqlValue(entry.inbox || null)},
      ${sqlValue(entry.actorId || null)},
      ${sqlValue(entry.status ?? null)},
      ${sqlValue(entry.ok ? 1 : 0)},
      ${sqlValue(entry.error || null)},
      ${sqlValue(entry.deliveredAt || new Date().toISOString())},
      ${sqlValue(entry.direction || null)},
      ${sqlValue(entry.attempts || 1)},
      ${sqlValue(entry.nextRetryAt || null)},
      ${sqlValue(JSON.stringify(entry))}
    );
  `);
}

function migrateLegacyJsonData() {
  if (tableCount("followers") === 0) {
    for (const entry of readLegacyJson("followers.json", [])) {
      if (entry?.actorId) insertFollowerEntry(entry);
    }
  }

  if (tableCount("activities") === 0) {
    for (const entry of readLegacyJson("activities.json", [])) {
      if (entry?.id) insertActivityPayload(entry);
    }
  }

  if (tableCount("published") === 0) {
    const published = readLegacyJson("published.json", {});
    for (const [url, entry] of Object.entries(published)) {
      insertPublishedEntry(url, entry || {});
    }
  }

  if (tableCount("deliveries") === 0) {
    for (const entry of readLegacyJson("deliveries.json", [])) {
      insertDeliveryEntry(entry);
    }
  }
}

export function initializeStorage() {
  if (initialized) return;
  runSql(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS followers (
      actor_id TEXT PRIMARY KEY,
      preferred_username TEXT,
      display_name TEXT,
      inbox TEXT,
      public_key TEXT,
      key_id TEXT,
      followed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocked_actors (
      actor_id TEXT PRIMARY KEY,
      note TEXT,
      blocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS remote_actors (
      actor_id TEXT PRIMARY KEY,
      preferred_username TEXT,
      display_name TEXT,
      inbox TEXT,
      public_key TEXT,
      key_id TEXT,
      fetched_at TEXT NOT NULL,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT,
      actor TEXT,
      published TEXT,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS activities_published_idx ON activities(published DESC);

    CREATE TABLE IF NOT EXISTS published (
      url TEXT PRIMARY KEY,
      activity_id TEXT,
      published_at TEXT,
      seeded INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id TEXT,
      inbox TEXT,
      actor_id TEXT,
      status INTEGER,
      ok INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      delivered_at TEXT NOT NULL,
      direction TEXT,
      attempts INTEGER NOT NULL DEFAULT 1,
      next_retry_at TEXT,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS deliveries_pending_idx ON deliveries(ok, next_retry_at, delivered_at DESC);
  `);
  migrateLegacyJsonData();
  initialized = true;
}

function parseJsonRows(rows, field = "payload") {
  return rows.map((row) => JSON.parse(row[field]));
}

export function readFollowers({ includeBlocked = false, limit = null, offset = 0 } = {}) {
  initializeStorage();
  const blockedJoin = includeBlocked
    ? ""
    : "LEFT JOIN blocked_actors blocked ON blocked.actor_id = followers.actor_id";
  const blockedWhere = includeBlocked ? "" : "WHERE blocked.actor_id IS NULL";
  const limitSql = limit ? ` LIMIT ${Number(limit)} OFFSET ${Number(offset || 0)}` : "";
  return runSql(`
    SELECT
      followers.actor_id AS actorId,
      followers.preferred_username AS preferredUsername,
      followers.display_name AS displayName,
      followers.inbox AS inbox,
      followers.public_key AS publicKey,
      followers.key_id AS keyId,
      followers.followed_at AS followedAt
    FROM followers
    ${blockedJoin}
    ${blockedWhere}
    ORDER BY datetime(followers.followed_at) DESC, followers.actor_id ASC
    ${limitSql};
  `, { json: true });
}

export function countFollowers({ includeBlocked = false } = {}) {
  initializeStorage();
  const countSql = includeBlocked
    ? "SELECT COUNT(*) FROM followers;"
    : `
      SELECT COUNT(*)
      FROM followers
      LEFT JOIN blocked_actors blocked ON blocked.actor_id = followers.actor_id
      WHERE blocked.actor_id IS NULL;
    `;
  return Number(runSql(countSql) || "0");
}

export function getFollower(actorId) {
  initializeStorage();
  const rows = runSql(`
    SELECT
      actor_id AS actorId,
      preferred_username AS preferredUsername,
      display_name AS displayName,
      inbox AS inbox,
      public_key AS publicKey,
      key_id AS keyId,
      followed_at AS followedAt
    FROM followers
    WHERE actor_id = ${sqlValue(actorId)}
    LIMIT 1;
  `, { json: true });
  return rows[0] || null;
}

export function upsertFollower(entry) {
  initializeStorage();
  insertFollowerEntry(entry);
}

export function writeFollowers(entries) {
  initializeStorage();
  runSql("DELETE FROM followers;");
  for (const entry of entries) {
    if (entry?.actorId) insertFollowerEntry(entry);
  }
}

export function removeFollower(actorId) {
  initializeStorage();
  runSql(`DELETE FROM followers WHERE actor_id = ${sqlValue(actorId)};`);
}

export function blockActor(actorId, note = null) {
  initializeStorage();
  runSql(`
    INSERT INTO blocked_actors (actor_id, note, blocked_at)
    VALUES (${sqlValue(actorId)}, ${sqlValue(note)}, ${sqlValue(new Date().toISOString())})
    ON CONFLICT(actor_id) DO UPDATE SET
      note = excluded.note,
      blocked_at = excluded.blocked_at;
  `);
  removeFollower(actorId);
}

export function unblockActor(actorId) {
  initializeStorage();
  runSql(`DELETE FROM blocked_actors WHERE actor_id = ${sqlValue(actorId)};`);
}

export function isActorBlocked(actorId) {
  initializeStorage();
  const rows = runSql(`
    SELECT actor_id FROM blocked_actors WHERE actor_id = ${sqlValue(actorId)} LIMIT 1;
  `, { json: true });
  return rows.length > 0;
}

export function readBlockedActors() {
  initializeStorage();
  return runSql(`
    SELECT actor_id AS actorId, note, blocked_at AS blockedAt
    FROM blocked_actors
    ORDER BY datetime(blocked_at) DESC, actor_id ASC;
  `, { json: true });
}

export function upsertRemoteActor(entry) {
  initializeStorage();
  runSql(`
    INSERT INTO remote_actors (
      actor_id, preferred_username, display_name, inbox, public_key, key_id, fetched_at, payload
    ) VALUES (
      ${sqlValue(entry.actorId)},
      ${sqlValue(entry.preferredUsername || null)},
      ${sqlValue(entry.displayName || null)},
      ${sqlValue(entry.inbox || null)},
      ${sqlValue(entry.publicKey || null)},
      ${sqlValue(entry.keyId || null)},
      ${sqlValue(entry.fetchedAt || new Date().toISOString())},
      ${sqlValue(JSON.stringify(entry.payload || null))}
    )
    ON CONFLICT(actor_id) DO UPDATE SET
      preferred_username = excluded.preferred_username,
      display_name = excluded.display_name,
      inbox = excluded.inbox,
      public_key = excluded.public_key,
      key_id = excluded.key_id,
      fetched_at = excluded.fetched_at,
      payload = excluded.payload;
  `);
}

export function getRemoteActorByActorId(actorId) {
  initializeStorage();
  const rows = runSql(`
    SELECT
      actor_id AS actorId,
      preferred_username AS preferredUsername,
      display_name AS displayName,
      inbox AS inbox,
      public_key AS publicKey,
      key_id AS keyId,
      fetched_at AS fetchedAt,
      payload
    FROM remote_actors
    WHERE actor_id = ${sqlValue(actorId)}
    LIMIT 1;
  `, { json: true });
  if (!rows[0]) return null;
  return {
    ...rows[0],
    payload: rows[0].payload ? JSON.parse(rows[0].payload) : null
  };
}

export function getRemoteActorByKeyId(keyId) {
  initializeStorage();
  const rows = runSql(`
    SELECT
      actor_id AS actorId,
      preferred_username AS preferredUsername,
      display_name AS displayName,
      inbox AS inbox,
      public_key AS publicKey,
      key_id AS keyId,
      fetched_at AS fetchedAt,
      payload
    FROM remote_actors
    WHERE key_id = ${sqlValue(keyId)}
    LIMIT 1;
  `, { json: true });
  if (!rows[0]) return null;
  return {
    ...rows[0],
    payload: rows[0].payload ? JSON.parse(rows[0].payload) : null
  };
}

export function readActivities({ limit = null, offset = 0 } = {}) {
  initializeStorage();
  const limitSql = limit ? ` LIMIT ${Number(limit)} OFFSET ${Number(offset || 0)}` : "";
  const rows = runSql(`
    SELECT payload
    FROM activities
    ORDER BY datetime(COALESCE(published, '1970-01-01T00:00:00Z')) DESC, id DESC
    ${limitSql};
  `, { json: true });
  return parseJsonRows(rows);
}

export function countActivities() {
  initializeStorage();
  return Number(runSql("SELECT COUNT(*) FROM activities;") || "0");
}

export function getActivityById(activityId) {
  initializeStorage();
  const rows = runSql(`
    SELECT payload
    FROM activities
    WHERE id = ${sqlValue(activityId)}
    LIMIT 1;
  `, { json: true });
  return rows[0]?.payload ? JSON.parse(rows[0].payload) : null;
}

export function writeActivities(entries) {
  initializeStorage();
  runSql("DELETE FROM activities;");
  for (const entry of entries) {
    if (entry?.id) insertActivityPayload(entry);
  }
}

export function appendActivity(entry) {
  initializeStorage();
  insertActivityPayload(entry);
}

export function readPublished() {
  initializeStorage();
  const rows = runSql(`
    SELECT url, payload
    FROM published
    ORDER BY url ASC;
  `, { json: true });
  return Object.fromEntries(rows.map((row) => [row.url, JSON.parse(row.payload)]));
}

export function writePublished(value) {
  initializeStorage();
  runSql("DELETE FROM published;");
  for (const [url, entry] of Object.entries(value || {})) {
    insertPublishedEntry(url, entry || {});
  }
}

export function readDeliveries({ onlyFailed = false, dueOnly = false, limit = null } = {}) {
  initializeStorage();
  const filters = [];
  if (onlyFailed) {
    filters.push("ok = 0");
  }
  if (dueOnly) {
    filters.push("(next_retry_at IS NULL OR datetime(next_retry_at) <= datetime('now'))");
  }
  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const limitSql = limit ? ` LIMIT ${Number(limit)}` : "";
  const rows = runSql(`
    SELECT payload
    FROM deliveries
    ${whereSql}
    ORDER BY datetime(delivered_at) DESC, id DESC
    ${limitSql};
  `, { json: true });
  return parseJsonRows(rows);
}

export function writeDeliveries(entries) {
  initializeStorage();
  runSql("DELETE FROM deliveries;");
  for (const entry of entries) {
    insertDeliveryEntry(entry);
  }
}

export function appendDelivery(entry) {
  initializeStorage();
  insertDeliveryEntry(entry);
}
