import { describe, it, expect } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("Unknown routes", () => {
  it("returns a consistent 404 response", async () => {
    const response = await request(app)
      .get("/api/does-not-exist")
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.requestId).toBeTruthy();
  });

  it("rejects malformed JSON", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("MALFORMED_JSON");
    expect(response.body.requestId).toBeTruthy();
  });
});
