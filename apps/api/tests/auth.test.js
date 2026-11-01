import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { authorize } from "../src/modules/auth/auth.middleware.js";

describe("authentication boundaries", () => {
  it("rejects protected requests without credentials", async () => {
    const response = await request(app).get("/api/v1/auth/me").expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(response.body.requestId).toBeTruthy();
  });

  it("does not allow public registration by default", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationId: "00000000-0000-0000-0000-000000000000",
        name: "Example Employee",
        email: "example.employee@example.test",
        password: "A secure password 123!",
        clientType: "mobile",
      })
      .expect(403);

    expect(response.body.error.code).toBe("REGISTRATION_DISABLED");
  });

  it("does not disclose whether a password-reset email exists", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "unknown@example.test" })
      .expect(200);

    expect(response.body.data.message).toContain("If an account exists");
    expect(response.body.data.resetToken).toBeUndefined();
  });

  it("enforces role boundaries in middleware", () => {
    const next = () => {};
    const response = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    authorize("ADMIN")(
      { id: "request-id", auth: { role: "EMPLOYEE" } },
      response,
      next,
    );
    expect(response.statusCode).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
