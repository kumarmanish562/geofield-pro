const drafts = new Map();
const queue = [];
const history = [];

function uuid() {
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createClientSurveyId() {
  return uuid();
}

export function saveDraft(
  payload,
  clientSurveyId = payload.clientSurveyId ?? createClientSurveyId(),
) {
  drafts.set(clientSurveyId, {
    client_survey_id: clientSurveyId,
    server_survey_id: null,
    payload: { ...payload, clientSurveyId },
    status: "DRAFT",
    server_version: 1,
    updated_at: new Date().toISOString(),
  });
  return clientSurveyId;
}

export function getDrafts() {
  return [...drafts.values()];
}

export function getDraft(clientSurveyId) {
  return drafts.get(clientSurveyId) ?? null;
}

export function enqueueSurvey(payload, version = 1) {
  const clientSurveyId = saveDraft(payload);
  const clientEventId = uuid();
  drafts.get(clientSurveyId).status = "PENDING_SYNC";
  queue.push({
    id: queue.length + 1,
    entity_id: clientSurveyId,
    entity_type: "SURVEY",
    client_event_id: clientEventId,
    operation: "UPSERT",
    payload: { clientSurveyId, clientEventId, version, surveyData: payload },
    status: "PENDING",
    retry_count: 0,
  });
  return { clientSurveyId, clientEventId };
}

export function getPendingQueue() {
  return queue.filter((item) => ["PENDING", "FAILED"].includes(item.status));
}

export function updateQueueItem(id, status, lastError = null, retryCount = 0) {
  const item = queue.find((entry) => entry.id === id);
  if (item)
    Object.assign(item, {
      status,
      last_error: lastError,
      retry_count: retryCount,
    });
}

export function markDraftStatus(
  clientSurveyId,
  status,
  serverVersion = 1,
  serverSurveyId = null,
) {
  const draft = drafts.get(clientSurveyId);
  if (draft)
    Object.assign(draft, {
      status,
      server_version: serverVersion,
      server_survey_id: serverSurveyId ?? draft.server_survey_id,
    });
}

export function addSyncHistory(item) {
  history.unshift({
    id: history.length + 1,
    ...item,
    created_at: new Date().toISOString(),
  });
}

export function getSyncHistory() {
  return history.slice(0, 100);
}

export function getOfflineSummary() {
  const statuses = {};
  for (const draft of drafts.values())
    statuses[draft.status] = (statuses[draft.status] ?? 0) + 1;
  return {
    drafts: statuses,
    queue: {},
    lastSync:
      history.find((item) => item.result === "SYNCED")?.created_at ?? null,
  };
}
