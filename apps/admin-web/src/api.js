const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

let accessToken;

export function setAccessToken(token) {
  accessToken = token;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-GeoField-Request": "1",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? "The request failed.");
  }
  return body;
}

export async function restoreSession() {
  const response = await apiRequest("/auth/refresh", {
    method: "POST",
    body: "{}",
  });
  setAccessToken(response.data.accessToken);
  return response.data.user;
}
