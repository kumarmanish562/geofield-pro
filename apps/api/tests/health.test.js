import { describe, it, expect } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("GET /api/health", () => {
  it("returns HTTP 200", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("returns a request ID", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.body.requestId).toBeTruthy();
  });
});