import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-GeoField-Request": "1",
  },
});

let accessToken = null;
let refreshRequest = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status !== 401 ||
      originalRequest?.url?.endsWith("/auth/refresh") ||
      originalRequest?._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshRequest ??= apiClient
      .post("/auth/refresh", {})
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });

    try {
      await refreshRequest;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      return Promise.reject(refreshError);
    }
  },
);

export async function login(credentials) {
  const { data } = await apiClient.post("/auth/login", {
    ...credentials,
    clientType: "web",
  });
  setAccessToken(data.data.accessToken);
  return data.data;
}

export async function restoreSession() {
  const { data } = await apiClient.post("/auth/refresh", {});
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function logout() {
  await apiClient.post("/auth/logout", {});
  clearAccessToken();
}

export async function requestPasswordReset(email) {
  const { data } = await apiClient.post("/auth/forgot-password", { email });
  return data.data;
}

export function getApiErrorMessage(error) {
  return (
    error.response?.data?.error?.message ??
    error.message ??
    "Something went wrong. Please try again."
  );
}

export default apiClient;
