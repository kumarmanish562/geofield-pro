import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/config/env.js";

describe("environment validation", () => {
  it("rejects production configuration without secure cookie settings", () => {
    const result = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/geofield",
      JWT_ISSUER: "geofield-pro-api",
      JWT_AUDIENCE: "geofield-pro-clients",
      JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
      JWT_SECRET: "a".repeat(32),
      ARGON2_MEMORY_COST: "19456",
      ARGON2_TIME_COST: "2",
      ARGON2_PARALLELISM: "1",
      REFRESH_TOKEN_TTL_DAYS: "7",
      AUTH_COOKIE_NAME: "geofield_refresh",
      COOKIE_SECURE: "false",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.some((issue) =>
      issue.path[0] === "COOKIE_SECURE"
    )).toBe(true);
  });
});
