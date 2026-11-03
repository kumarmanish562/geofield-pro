import { describe, expect, it, vi } from "vitest";

import { ApiError } from "./apiErrors.js";
import { openNotificationTarget } from "../navigation/notificationNavigation.js";

describe("mobile API client", () => {
  it("preserves structured API error information", () => {
    const error = new ApiError("Session expired.", "SESSION_EXPIRED", 401);
    expect(error.message).toBe("Session expired.");
    expect(error.code).toBe("SESSION_EXPIRED");
    expect(error.status).toBe(401);
  });

  it("routes assignment notifications to the assignment details screen", () => {
    const navigation = { navigate: vi.fn() };
    const opened = openNotificationTarget(navigation, {
      eventType: "ASSIGNMENT_PUBLISHED",
      resourceType: "ASSIGNMENT",
      resourceId: "assignment-id",
    });

    expect(opened).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith("AssignmentsTab", {
      screen: "AssignmentDetails",
      params: { id: "assignment-id" },
    });
  });

  it("does not navigate for an unsupported event type", () => {
    const navigation = { navigate: vi.fn() };
    expect(openNotificationTarget(navigation, { eventType: "UNKNOWN" })).toBe(
      false,
    );
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
