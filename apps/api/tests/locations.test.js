import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { observationSchema } from "../src/modules/locations/location.schemas.js";

describe("location tracking", () => {
  it("requires authentication for employee location submissions", async () => {
    const response = await request(app).post("/api/v1/locations").send({}).expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects coordinates outside WGS84 bounds", () => {
    expect(observationSchema.safeParse({
      eventId: "location-event-1",
      latitude: 91,
      longitude: 81,
      capturedAt: new Date().toISOString(),
    }).success).toBe(false);
    expect(observationSchema.safeParse({
      eventId: "location-event-2",
      latitude: 21,
      longitude: 181,
      capturedAt: new Date().toISOString(),
    }).success).toBe(false);
  });

  it("requires authentication for organization location data", async () => {
    const response = await request(app).get("/api/v1/admin/locations/latest").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
