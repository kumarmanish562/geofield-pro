import { describe, expect, it } from "vitest";

import { ApiError } from "./apiErrors.js";

describe("mobile API client", () => {
  it("preserves structured API error information", () => {
    const error = new ApiError("Session expired.", "SESSION_EXPIRED", 401);
    expect(error.message).toBe("Session expired.");
    expect(error.code).toBe("SESSION_EXPIRED");
    expect(error.status).toBe(401);
  });
});
