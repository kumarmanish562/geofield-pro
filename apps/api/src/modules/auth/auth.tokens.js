import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

import { env } from "../../config/env.js";

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

export function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAccessToken({
  userId,
  sessionId,
  organizationId,
  role,
}) {
  return new SignJWT({
    sid: sessionId,
    org: organizationId,
    role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(
      `${env.JWT_ACCESS_TOKEN_TTL_SECONDS}s`
    )
    .sign(jwtSecret);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwtSecret, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ["HS256"],
  });

  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.org !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("Invalid access token claims");
  }

  return payload;
}