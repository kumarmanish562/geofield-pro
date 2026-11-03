import * as SecureStore from "expo-secure-store";
import { ApiError } from "./apiErrors.js";
import { setOfflineOwner } from "./offlineStore";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const REFRESH_TOKEN_KEY = "geofield.refresh_token";
const ATTENDANCE_QUEUE_KEY = "geofield.attendance_queue";

let accessToken = null;
let activeUserId = null;
let refreshPromise = null;

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function request(path, options = {}, retry = true) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "The server could not be reached. Check your connection and try again.",
      "NETWORK_ERROR",
    );
  }

  const body = await readJson(response);
  if (response.status === 401 && retry && path !== "/auth/refresh") {
    try {
      await refreshSession();
      return request(path, options, false);
    } catch {
      await clearSession();
    }
  }
  if (!response.ok) {
    throw new ApiError(
      body.error?.message ?? "The request failed. Please try again.",
      body.error?.code ?? "REQUEST_FAILED",
      response.status,
    );
  }
  return body;
}

export async function login(email, password) {
  const response = await request(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password, clientType: "mobile" }),
    },
    false,
  );
  await saveSession(response.data);
  return response.data.user;
}

export async function refreshSession() {
  refreshPromise ??= (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken)
      throw new ApiError("Your session has expired.", "SESSION_EXPIRED", 401);
    const response = await request(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      false,
    );
    await saveSession(response.data);
    return response.data.user;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function restoreSession() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    return await refreshSession();
  } catch {
    await clearSession();
    return null;
  }
}

export async function logout() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) {
      await request(
        "/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        },
        false,
      );
    }
  } finally {
    await clearSession();
  }
}

export async function requestPasswordReset(email) {
  return request(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    false,
  );
}

export async function resetPassword(token, password) {
  return request(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({ token, password }),
    },
    false,
  );
}

export async function acceptInvitation(token, name, password) {
  const response = await request(
    "/auth/accept-invitation",
    {
      method: "POST",
      body: JSON.stringify({ token, name, password, clientType: "mobile" }),
    },
    false,
  );
  await saveSession(response.data);
  return response.data.user;
}

export async function clearSession() {
  accessToken = null;
  activeUserId = null;
  setOfflineOwner(null);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function saveSession(data) {
  accessToken = data.accessToken;
  activeUserId = data.user?.id ?? null;
  setOfflineOwner(activeUserId);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
}

function attendanceQueueKey() {
  if (!activeUserId)
    throw new ApiError(
      "Sign in to access offline attendance.",
      "SESSION_EXPIRED",
      401,
    );
  return `${ATTENDANCE_QUEUE_KEY}.${activeUserId}`;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function createEventId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getAttendanceCurrent() {
  return request("/attendance/current");
}

export async function getAttendanceHistory() {
  return request("/attendance/history?page=1&pageSize=50");
}

export async function submitAttendanceEvent(eventType, metadata = {}) {
  const event = {
    idempotencyKey: createEventId(),
    clientEventId: createEventId(),
    eventType,
    clientOccurredAt: new Date().toISOString(),
    metadata,
  };
  const path =
    eventType === "CHECK_IN"
      ? "/attendance/check-in"
      : eventType === "BREAK_START"
        ? "/attendance/break/start"
        : eventType === "BREAK_END"
          ? "/attendance/break/end"
          : "/attendance/check-out";
  return request(path, { method: "POST", body: JSON.stringify(event) }, false);
}

export async function queueAttendanceEvent(eventType, metadata = {}) {
  const queueKey = attendanceQueueKey();
  const queued = JSON.parse((await SecureStore.getItemAsync(queueKey)) ?? "[]");
  queued.push({
    clientEventId: createEventId(),
    eventType,
    clientOccurredAt: new Date().toISOString(),
    metadata,
  });
  await SecureStore.setItemAsync(queueKey, JSON.stringify(queued));
  return queued.length;
}

export async function getPendingAttendanceEvents() {
  return JSON.parse(
    (await SecureStore.getItemAsync(attendanceQueueKey())) ?? "[]",
  );
}

export async function synchronizeAttendanceEvents() {
  const queueKey = attendanceQueueKey();
  const queued = await getPendingAttendanceEvents();
  if (!queued.length) return { results: [] };
  const response = await request(
    "/attendance/sync",
    { method: "POST", body: JSON.stringify({ events: queued }) },
    false,
  );
  const rejected = queued.filter(
    (event) =>
      response.data.results.find(
        (result) => result.clientEventId === event.clientEventId,
      )?.status === "REJECTED",
  );
  const processedIds = new Set(
    response.data.results
      .filter((result) => result.status === "PROCESSED")
      .map((result) => result.clientEventId),
  );
  await SecureStore.setItemAsync(
    queueKey,
    JSON.stringify([
      ...rejected,
      ...queued.filter((event) => !processedIds.has(event.clientEventId)),
    ]),
  );
  return response.data;
}

export async function requestAttendanceCorrection(attendanceId, data) {
  return request(`/attendance/${attendanceId}/corrections`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTrackingSession() {
  return request("/locations/session/current");
}

export async function submitLocationObservation(data) {
  return request(
    "/locations",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    false,
  );
}

export async function getAssignedVillages() {
  return request("/villages?page=1&pageSize=50");
}

export async function getAssignedVillageBoundary(villageId) {
  return request(`/villages/${encodeURIComponent(villageId)}`);
}

export async function getMyAssignments(params = {}) {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "50",
    ...params,
  }).toString();
  return request(`/me/assignments?${query}`);
}

export async function getMyAssignment(id) {
  return request(`/me/assignments/${id}`);
}

export async function getSurveys(params = {}) {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "50",
    ...params,
  }).toString();
  return request(`/surveys?${query}`);
}

export async function syncOfflineSurvey(payload) {
  return request("/sync/surveys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSyncStatus() {
  return request("/sync/status");
}

export async function getSyncHistory() {
  return request("/sync/history?page=1&pageSize=100");
}

export async function createSurvey(data) {
  return request("/surveys", { method: "POST", body: JSON.stringify(data) });
}

export async function createSurveyAttachmentUpload(surveyId, data) {
  return request(`/surveys/${surveyId}/attachments/upload`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeSurveyAttachment(surveyId, attachmentId) {
  return request(`/surveys/${surveyId}/attachments/${attachmentId}/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function uploadSurveyAttachmentContent(
  surveyId,
  attachmentId,
  blob,
  mimeType,
) {
  return request(`/surveys/${surveyId}/attachments/${attachmentId}/content`, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
}

export async function uploadSurveyPhoto(surveyId, asset, clientAttachmentId) {
  const response = await fetch(asset.uri);
  if (!response.ok)
    throw new ApiError(
      "The selected photo could not be read.",
      "PHOTO_READ_FAILED",
    );
  const blob = await response.blob();
  const mimeType = asset.mimeType ?? blob.type ?? "image/jpeg";
  const upload = await createSurveyAttachmentUpload(surveyId, {
    clientAttachmentId,
    originalFileName: asset.fileName ?? `survey-${Date.now()}.jpg`,
    mimeType,
    fileSize: blob.size,
  });
  if (upload.data.status !== "COMPLETED") {
    await uploadSurveyAttachmentContent(
      surveyId,
      upload.data.attachmentId,
      blob,
      mimeType,
    );
  }
  await completeSurveyAttachment(surveyId, upload.data.attachmentId);
  return upload.data.attachmentId;
}

export async function getSurveyAttachments(surveyId) {
  return request(`/surveys/${surveyId}/attachments`);
}

export async function updateSurvey(id, data) {
  return request(`/surveys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function submitSurvey(id, idempotencyKey = `mobile-survey-${id}`) {
  return request(`/surveys/${id}/submit`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({}),
  });
}

export async function getSurveyReview(id) {
  return request(`/surveys/${id}`);
}

export async function getSurveyReviewHistory(id) {
  return request(`/survey-reviews/${id}/history`);
}

export async function resubmitSurvey(
  id,
  idempotencyKey = `mobile-resubmit-${id}-${Date.now()}`,
) {
  return request(`/surveys/${id}/resubmit`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({}),
  });
}

export async function getNotifications({
  page = 1,
  pageSize = 20,
  unreadOnly = false,
  readOnly = false,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    unreadOnly: String(unreadOnly),
    readOnly: String(readOnly),
  });
  return request(`/notifications?${query}`);
}

export async function getNotificationUnreadCount() {
  return request("/notifications/unread-count");
}

export async function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return request("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getNotificationPreferences() {
  return request("/notification-preferences");
}

export async function updateNotificationPreferences(preferences) {
  return request("/notification-preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
}

export async function registerPushDevice(
  expoPushToken,
  devicePlatform,
  deviceName,
) {
  return request("/push-devices/register", {
    method: "POST",
    body: JSON.stringify({ expoPushToken, devicePlatform, deviceName }),
  });
}
