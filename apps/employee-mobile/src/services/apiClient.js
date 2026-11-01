import * as SecureStore from "expo-secure-store";
import { ApiError } from "./apiErrors.js";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const REFRESH_TOKEN_KEY = "geofield.refresh_token";

let accessToken = null;
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
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function saveSession(data) {
  accessToken = data.accessToken;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
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
