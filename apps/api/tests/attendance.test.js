import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { attendanceMutationSchema, correctionCreateSchema } from "../src/modules/attendance/attendance.schemas.js";

describe("attendance management", () => {
  it("requires authentication for attendance operations", async () => {
    const response = await request(app).get("/api/v1/attendance/current").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("requires idempotency and rejects invalid corrections", () => {
    expect(attendanceMutationSchema.safeParse({}).success).toBe(false);
    expect(correctionCreateSchema.safeParse({ reason: "too short" }).success).toBe(false);
  });

  it("does not allow a correction without a proposed timestamp", () => {
    expect(correctionCreateSchema.safeParse({ reason: "Please correct my attendance record." }).success).toBe(false);
  });
});
