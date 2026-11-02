import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { coordinateSchema, villageCreateSchema } from "../src/modules/villages/village.schemas.js";

describe("village GIS management", () => {
  it("requires authentication for village access", async () => {
    const response = await request(app).get("/api/v1/villages").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("validates WGS84 coordinate bounds", () => {
    expect(coordinateSchema.safeParse({ longitude: 181, latitude: 0 }).success).toBe(false);
    expect(coordinateSchema.safeParse({ longitude: 81, latitude: 21 }).success).toBe(true);
  });

  it("requires village name and code", () => {
    expect(villageCreateSchema.safeParse({ name: "", code: "" }).success).toBe(false);
  });
});
