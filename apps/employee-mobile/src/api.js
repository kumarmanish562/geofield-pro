import * as SecureStore from "expo-secure-store";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const ACCESS_TOKEN_KEY = "geofield.access_token";
const REFRESH_TOKEN_KEY = "geofield.refresh_token";

export async function login(email, password) {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, clientType: "mobile" }),
  });
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
  return response.data.user;
}

export async function restoreSession() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  const response = await request("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
  return response.data.user;
}

export async function logout() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  await request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function recoverPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function acceptInvitation(token, name, password) {
  const response = await request("/auth/accept-invitation", {
    method: "POST",
    body: JSON.stringify({ token, name, password, clientType: "mobile" }),
  });
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
  return response.data.user;
}

async function request(path, options) {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message ?? "The request failed.");
  return body;
}
