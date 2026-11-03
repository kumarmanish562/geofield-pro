const drafts = new Map();
const queue = [];
const history = [];
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
    owner_user_id: owner(),
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
  const ownerId = owner();
  return [...drafts.values()].filter(
    (draft) => draft.owner_user_id === ownerId,
  );
}

export function getDraft(clientSurveyId) {
  const ownerId = owner();
  const draft = drafts.get(clientSurveyId);
  return draft?.owner_user_id === ownerId ? draft : null;
}

export function enqueueSurvey(payload, version = 1) {
  const clientSurveyId = saveDraft(payload);
  const clientEventId = uuid();
  drafts.get(clientSurveyId).status = "PENDING_SYNC";
  queue.push({
    id: queue.length + 1,
    owner_user_id: owner(),
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
  const ownerId = owner();
  return queue.filter(
    (item) =>
      item.owner_user_id === ownerId &&
      ["PENDING", "FAILED"].includes(item.status),
  );
}

export function updateQueueItem(id, status, lastError = null, retryCount = 0) {
  const item = queue.find(
    (entry) => entry.id === id && entry.owner_user_id === owner(),
  );
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
  if (draft?.owner_user_id === owner())
    Object.assign(draft, {
      status,
      server_version: serverVersion,
      server_survey_id: serverSurveyId ?? draft.server_survey_id,
    });
}

export function addSyncHistory(item) {
  history.unshift({
    owner_user_id: owner(),
    id: history.length + 1,
    ...item,
    created_at: new Date().toISOString(),
  });
}

export function getSyncHistory() {
  const ownerId = owner();
  return history.filter((item) => item.owner_user_id === ownerId).slice(0, 100);
}

export function getOfflineSummary() {
  const ownerId = owner();
  const statuses = {};
  for (const draft of drafts.values())
    if (draft.owner_user_id === ownerId)
      statuses[draft.status] = (statuses[draft.status] ?? 0) + 1;
  return {
    drafts: statuses,
    queue: {},
    lastSync:
      history.find(
        (item) => item.owner_user_id === ownerId && item.result === "SYNCED",
      )?.created_at ?? null,
  };
}
