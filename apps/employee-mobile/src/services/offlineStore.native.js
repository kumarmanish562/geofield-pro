import * as SQLite from "expo-sqlite";

const database = SQLite.openDatabaseSync("geofield-offline.db");

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = ((Date.now() + Math.random() * 16) % 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

database.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS survey_drafts (
    client_survey_id TEXT PRIMARY KEY NOT NULL,
    server_survey_id TEXT,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    server_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync_queue (
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
  const timestamp = now();
  database.runSync(
    `INSERT INTO survey_drafts (client_survey_id, payload, status, created_at, updated_at)
     VALUES (?, ?, 'DRAFT', ?, ?)
     ON CONFLICT(client_survey_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    [
      clientSurveyId,
      JSON.stringify({ ...payload, clientSurveyId }),
      timestamp,
      timestamp,
    ],
  );
  return clientSurveyId;
}

export function getDrafts() {
  return database
    .getAllSync("SELECT * FROM survey_drafts ORDER BY updated_at DESC")
    .map((row) => ({
      ...row,
      payload: JSON.parse(row.payload),
    }));
}

export function getDraft(clientSurveyId) {
  const row = database.getFirstSync(
    "SELECT * FROM survey_drafts WHERE client_survey_id = ?",
    [clientSurveyId],
  );
  return row ? { ...row, payload: JSON.parse(row.payload) } : null;
}

export function enqueueSurvey(payload, version = 1) {
  const clientSurveyId = saveDraft(payload);
  const clientEventId = uuid();
  const timestamp = now();
  database.runSync(
    `UPDATE survey_drafts SET status = 'PENDING_SYNC', updated_at = ? WHERE client_survey_id = ?`,
    [timestamp, clientSurveyId],
  );
  database.runSync(
    `INSERT OR IGNORE INTO sync_queue
      (entity_type, entity_id, client_event_id, operation, payload, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
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
    ],
  );
  return { clientSurveyId, clientEventId };
}

export function getPendingQueue() {
  return database
    .getAllSync(
      `SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY created_at`,
      [now()],
    )
    .map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
}

export function updateQueueItem(id, status, error = null, retryCount = 0) {
  const timestamp = now();
  const delay = Math.min(60, 5 * 2 ** Math.max(0, retryCount - 1));
  database.runSync(
    `UPDATE sync_queue SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?`,
    [
      status,
      retryCount,
      error,
      status === "FAILED"
        ? new Date(Date.now() + delay * 1000).toISOString()
        : null,
      timestamp,
      id,
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
    `UPDATE survey_drafts SET status = ?, server_version = ?, server_survey_id = COALESCE(?, server_survey_id), updated_at = ? WHERE client_survey_id = ?`,
    [status, serverVersion, serverSurveyId, now(), clientSurveyId],
  );
}

export function addSyncHistory(item) {
  database.runSync(
    `INSERT INTO sync_history (entity_id, entity_type, operation, attempt_number, result, error_message, server_response, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.entityId,
      item.entityType,
      item.operation,
      item.attemptNumber,
      item.result,
      item.errorMessage ?? null,
      JSON.stringify(item.serverResponse ?? null),
      now(),
    ],
  );
}

export function getSyncHistory() {
  return database.getAllSync(
    "SELECT * FROM sync_history ORDER BY created_at DESC LIMIT 100",
  );
}

export function getOfflineSummary() {
  const rows = database.getAllSync(
    "SELECT status, COUNT(*) AS count FROM survey_drafts GROUP BY status",
  );
  const queue = database.getAllSync(
    "SELECT status, COUNT(*) AS count FROM sync_queue GROUP BY status",
  );
  return {
    drafts: Object.fromEntries(rows.map((row) => [row.status, row.count])),
    queue: Object.fromEntries(queue.map((row) => [row.status, row.count])),
    lastSync:
      database.getFirstSync(
        "SELECT created_at FROM sync_history WHERE result = 'SYNCED' ORDER BY created_at DESC",
      )?.created_at ?? null,
  };
}
