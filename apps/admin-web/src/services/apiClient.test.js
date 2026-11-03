import { afterEach, describe, expect, it, vi } from "vitest";

import apiClient, {
  clearAccessToken,
  getApiErrorMessage,
  setAccessToken,
} from "./apiClient.js";

afterEach(() => {
  clearAccessToken();
  vi.restoreAllMocks();
});

describe("getApiErrorMessage", () => {
  it("uses the API error message when available", () => {
    expect(
      getApiErrorMessage({
        response: { data: { error: { message: "Session expired." } } },
      }),
    ).toBe("Session expired.");
  });

  it("returns a safe fallback for unknown errors", () => {
    expect(getApiErrorMessage({})).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("sends the in-memory access token as a bearer header", async () => {
    const adapter = vi.fn(async (config) => ({
      data: { success: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = adapter;
    setAccessToken("synthetic-access-token");

    try {
      await apiClient.get("/workforce/employees");
      expect(adapter.mock.calls[0][0].headers.Authorization).toBe(
        "Bearer synthetic-access-token",
      );
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });
});
