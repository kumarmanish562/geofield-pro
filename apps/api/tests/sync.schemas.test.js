import { describe, expect, it } from "vitest";
import { surveySyncSchema } from "../src/modules/sync/sync.schemas.js";

describe("offline synchronization validation", () => {
  const valid = {
    clientSurveyId: "11111111-1111-4111-8111-111111111111",
    clientEventId: "22222222-2222-4222-8222-222222222222",
    version: 1,
    surveyData: {
      assignmentId: "33333333-3333-4333-8333-333333333333",
      villageId: "44444444-4444-4444-8444-444444444444",
      gatNumber: "123",
      latitude: 21.1458,
      longitude: 79.0882,
      accuracy: 5.2,
      notes: "Offline capture",
    },
  };

  it("accepts a stable offline survey event", () => {
    expect(surveySyncSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid coordinates", () => {
    expect(surveySyncSchema.safeParse({
      ...valid,
      surveyData: { ...valid.surveyData, latitude: 91 },
    }).success).toBe(false);
  });
});
