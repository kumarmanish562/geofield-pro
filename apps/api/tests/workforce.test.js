import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { employeeUpdateSchema } from "../src/modules/workforce/workforce.schemas.js";

describe("workforce authorization boundaries", () => {
  it("requires authentication for workforce records", async () => {
    const response = await request(app)
      .get("/api/v1/workforce/employees")
      .expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects privileged fields from employee profile updates", () => {
    const result = employeeUpdateSchema.safeParse({
      role: "ADMIN",
      organizationId: "00000000-0000-0000-0000-000000000000",
    });

    expect(result.success).toBe(false);
  });
});
