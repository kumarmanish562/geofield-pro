import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "./apiClient.js";

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
});
