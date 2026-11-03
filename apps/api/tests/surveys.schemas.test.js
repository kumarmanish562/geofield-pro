import { describe, expect, it } from "vitest";
import { attachmentSchema, surveyCreateSchema } from "../src/modules/surveys/surveys.schemas.js";

describe("survey validation", () => {
  const valid = {
    assignmentId: "11111111-1111-4111-8111-111111111111",
    villageId: "22222222-2222-4222-8222-222222222222",
    gatNumber: "GAT-12",
    latitude: 19.076,
    longitude: 72.8777,
    gpsAccuracy: 4.5,
  };

  it("accepts valid survey coordinates", () => {
    expect(surveyCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects coordinates outside WGS84 bounds", () => {
    expect(surveyCreateSchema.safeParse({ ...valid, latitude: 91 }).success).toBe(false);
    expect(surveyCreateSchema.safeParse({ ...valid, longitude: -181 }).success).toBe(false);
  });

  it("rejects unsupported or oversized attachments", () => {
    expect(attachmentSchema.safeParse({ originalFileName: "field.pdf", mimeType: "application/pdf", fileSize: 10 }).success).toBe(false);
    expect(attachmentSchema.safeParse({ originalFileName: "field.jpg", mimeType: "image/jpeg", fileSize: 10 * 1024 * 1024 + 1 }).success).toBe(false);
  });
});
