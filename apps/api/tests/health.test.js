import { afterEach, describe, it, expect, vi } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/database/prisma.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Health and readiness endpoints", () => {
  it("returns HTTP 200", async () => {
    const response = await request(app)
      .get("/api/v1/health")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("returns a request ID", async () => {
    const response = await request(app)
      .get("/api/v1/health")
      .expect(200);

    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.body.requestId).toBeTruthy();
  });

  it("serves Swagger UI", async () => {
    const response = await request(app)
      .get("/api/v1/docs")
      .redirects(1)
      .expect(200);
    expect(response.text).toContain("swagger-ui");
  });

  it("returns readiness when dependencies are available", async () => {
    const response = await request(app).get("/api/v1/ready").expect(200);
    expect(response.body.data.dependencies.postgres).toBe("up");
    expect(response.body.data.dependencies.postgis).toBe("up");
  });

  it("returns 503 when a dependency is unavailable", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
      new Error("database unavailable")
    );

    const response = await request(app).get("/api/v1/ready").expect(503);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(response.body.error.message).toBe("database unavailable");
  });
});