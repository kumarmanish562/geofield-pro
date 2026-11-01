import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { assignmentCreateSchema, assignmentUpdateSchema } from "../src/modules/assignments/assignment.schemas.js";

describe("assignment management", () => {
  it("requires authentication for assignment reads", async () => {
    const response = await request(app).get("/api/v1/assignments").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects invalid date ranges and privileged fields", () => {
    const result = assignmentCreateSchema.safeParse({
      name: "Village survey",
      startDate: "2026-12-10",
      dueDate: "2026-12-01",
      supervisorId: "00000000-0000-0000-0000-000000000001",
      organizationId: "00000000-0000-0000-0000-000000000002",
    });
    expect(result.success).toBe(false);
    expect(assignmentUpdateSchema.safeParse({ status: "PUBLISHED" }).success).toBe(false);
  });
});
