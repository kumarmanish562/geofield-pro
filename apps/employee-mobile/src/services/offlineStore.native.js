import * as SQLite from "expo-sqlite";

const database = SQLite.openDatabaseSync("geofield-offline.db");
let activeOwnerId = null;
export function setOfflineOwner(userId) {
  activeOwnerId = userId ?? null;
}
function owner() {
  if (!activeOwnerId)
    throw new Error("Offline data requires an authenticated account.");
  return activeOwnerId;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = ((Date.now() + Math.random() * 16) % 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

database.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS survey_drafts (
    owner_user_id TEXT,
    client_survey_id TEXT PRIMARY KEY NOT NULL,
    server_survey_id TEXT,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    server_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync_queue (
    owner_user_id TEXT,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    client_event_id TEXT NOT NULL UNIQUE,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync_history (
    owner_user_id TEXT,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    result TEXT NOT NULL,
    error_message TEXT,
    server_response TEXT,
    created_at TEXT NOT NULL
  );
`);
for (const table of ["survey_drafts", "sync_queue", "sync_history"]) {
  try {
    database.execSync(`ALTER TABLE ${table} ADD COLUMN owner_user_id TEXT`);
  } catch {
    /* already migrated */
  }
}
try {
  database.execSync(
    "ALTER TABLE survey_drafts ADD COLUMN server_survey_id TEXT",
  );
} catch {
  // Existing installations already have the column.
}

function now() {
  return new Date().toISOString();
}

export function createClientSurveyId() {
  return uuid();
}

export function saveDraft(
  payload,
  clientSurveyId = payload.clientSurveyId ?? createClientSurveyId(),
) {
  const ownerId = owner();
  const timestamp = now();
  database.runSync(
    `INSERT INTO survey_drafts (client_survey_id, owner_user_id, payload, status, created_at, updated_at)
     VALUES (?, ?, ?, 'DRAFT', ?, ?)
     ON CONFLICT(client_survey_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
     WHERE survey_drafts.owner_user_id = excluded.owner_user_id`,
    [
      clientSurveyId,
      ownerId,
      JSON.stringify({ ...payload, clientSurveyId }),
      timestamp,
      timestamp,
    ],
  );
  return clientSurveyId;
}

export function getDrafts() {
  return database
    .getAllSync(
      "SELECT * FROM survey_drafts WHERE owner_user_id = ? ORDER BY updated_at DESC",
      [owner()],
    )
    .map((row) => ({
      ...row,
      payload: JSON.parse(row.payload),
    }));
}

export function getDraft(clientSurveyId) {
  const row = database.getFirstSync(
    "SELECT * FROM survey_drafts WHERE client_survey_id = ? AND owner_user_id = ?",
    [clientSurveyId, owner()],
  );
  return row ? { ...row, payload: JSON.parse(row.payload) } : null;
}

export function enqueueSurvey(payload, version = 1) {
  const clientSurveyId = saveDraft(payload);
  const clientEventId = uuid();
  const timestamp = now();
  database.runSync(
    `UPDATE survey_drafts SET status = 'PENDING_SYNC', updated_at = ? WHERE client_survey_id = ? AND owner_user_id = ?`,
    [timestamp, clientSurveyId, owner()],
  );
  database.runSync(
    `INSERT OR IGNORE INTO sync_queue
      (entity_type, entity_id, client_event_id, operation, payload, status, created_at, updated_at, owner_user_id)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
    [
      "SURVEY",
      clientSurveyId,
      clientEventId,
      "UPSERT",
      JSON.stringify({
        clientSurveyId,
        clientEventId,
        version,
        surveyData: payload,
      }),
      timestamp,
      timestamp,
      owner(),
    ],
  );
  return { clientSurveyId, clientEventId };
}

export function getPendingQueue() {
  return database
    .getAllSync(
      `SELECT * FROM sync_queue WHERE owner_user_id = ? AND status IN ('PENDING', 'FAILED') AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY created_at`,
      [owner(), now()],
    )
    .map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
}

export function updateQueueItem(id, status, error = null, retryCount = 0) {
  const timestamp = now();
  const delay = Math.min(60, 5 * 2 ** Math.max(0, retryCount - 1));
  database.runSync(
    `UPDATE sync_queue SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?`,
    [
      status,
      retryCount,
      error,
      status === "FAILED"
        ? new Date(Date.now() + delay * 1000).toISOString()
        : null,
      timestamp,
      id,
      owner(),
    ],
  );
}

export function markDraftStatus(
  clientSurveyId,
  status,
  serverVersion = 1,
  serverSurveyId = null,
) {
  database.runSync(
    `UPDATE survey_drafts SET status = ?, server_version = ?, server_survey_id = COALESCE(?, server_survey_id), updated_at = ? WHERE client_survey_id = ? AND owner_user_id = ?`,
    [status, serverVersion, serverSurveyId, now(), clientSurveyId, owner()],
  );
}

export function addSyncHistory(item) {
  database.runSync(
    `INSERT INTO sync_history (entity_id, entity_type, operation, attempt_number, result, error_message, server_response, created_at, owner_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.entityId,
      item.entityType,
      item.operation,
      item.attemptNumber,
      item.result,
      item.errorMessage ?? null,
      JSON.stringify(item.serverResponse ?? null),
      now(),
      owner(),
    ],
  );
}

export function getSyncHistory() {
  return database.getAllSync(
    "SELECT * FROM sync_history WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 100",
    [owner()],
  );
}

export function getOfflineSummary() {
  const rows = database.getAllSync(
    "SELECT status, COUNT(*) AS count FROM survey_drafts WHERE owner_user_id = ? GROUP BY status",
    [owner()],
  );
  const queue = database.getAllSync(
    "SELECT status, COUNT(*) AS count FROM sync_queue WHERE owner_user_id = ? GROUP BY status",
    [owner()],
  );
  return {
    drafts: Object.fromEntries(rows.map((row) => [row.status, row.count])),
    queue: Object.fromEntries(queue.map((row) => [row.status, row.count])),
    lastSync:
      database.getFirstSync(
        "SELECT created_at FROM sync_history WHERE owner_user_id = ? AND result = 'SYNCED' ORDER BY created_at DESC",
        [owner()],
      )?.created_at ?? null,
  };
}
