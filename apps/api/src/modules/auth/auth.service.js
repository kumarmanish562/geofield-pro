import argon2 from "argon2";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";

import {
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./auth.tokens.js";

const MAX_FAILED_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export class AuthError extends Error {
  constructor(message, statusCode = 401, code = "AUTHENTICATION_FAILED") {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function genericCredentialsError() {
  return new AuthError(
    "Invalid email or password",
    401,
    "INVALID_CREDENTIALS"
  );
}

function ensureAccountCanLogin(user) {
  if (
    user.status !== "ACTIVE" ||
    user.organization.status !== "ACTIVE"
  ) {
    throw genericCredentialsError();
  }
}

function getRefreshExpiry() {
  return new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
}

function getRequestMetadata(req) {
  return {
    ipAddress:
      typeof req.ip === "string" ? req.ip.slice(0, 45) : null,
    userAgent:
      typeof req.get("user-agent") === "string"
        ? req.get("user-agent").slice(0, 512)
        : null,
  };
}

async function createSession(tx, user, req) {
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshExpiry();
  const metadata = getRequestMetadata(req);

  const session = await tx.authSession.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  await tx.refreshToken.create({
    data: {
      sessionId: session.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });

  return {
    session,
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
}

export async function login({ email, password, clientType, req }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  // Use the same outward-facing error for unknown and invalid credentials.
  if (!user) {
    throw genericCredentialsError();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthError(
      "Login is temporarily unavailable",
      423,
      "ACCOUNT_TEMPORARILY_LOCKED"
    );
  }

  const passwordValid = await argon2.verify(
    user.passwordHash,
    password
  );

  if (!passwordValid) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : failedAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null,
      },
    });

    throw genericCredentialsError();
  }

  ensureAccountCanLogin(user);

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return createSession(tx, user, req);
  });

  const accessToken = await createAccessToken({
    userId: user.id,
    sessionId: result.session.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  return {
    accessToken,
    refreshToken:
      clientType === "mobile" ? result.refreshToken : undefined,
    refreshExpiresAt: result.refreshExpiresAt,
    user: publicUser(user),
  };
}

export async function refreshSession({ refreshToken }) {
  if (!refreshToken) {
    throw new AuthError(
      "A refresh token is required",
      401,
      "REFRESH_TOKEN_REQUIRED"
    );
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const outcome = await prisma.$transaction(async (tx) => {
    const oldToken = await tx.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: {
            user: { include: { organization: true } },
          },
        },
      },
    });

    if (!oldToken) {
      return { type: "invalid" };
    }

    const { session } = oldToken;
    const now = new Date();

    if (
      oldToken.usedAt ||
      oldToken.revokedAt ||
      oldToken.expiresAt <= now
    ) {
      // Reuse of a previously rotated token may indicate theft.
      // Revoke the whole session when an already-used token is replayed.
      if (oldToken.usedAt) {
        await tx.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        });

        await tx.refreshToken.updateMany({
          where: { sessionId: session.id, revokedAt: null },
          data: { revokedAt: now },
        });

        return { type: "replayed" };
      }

      return { type: "invalid" };
    }

    if (
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE" ||
      session.user.organization.status !== "ACTIVE"
    ) {
      return { type: "invalid" };
    }

    // Claim the old token exactly once. Concurrent refresh requests
    // must not both receive a new token from the same old token.
    const claimed = await tx.refreshToken.updateMany({
      where: {
        id: oldToken.id,
        usedAt: null,
        revokedAt: null,
      },
      data: { usedAt: now },
    });

    if (claimed.count !== 1) {
      await tx.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.refreshToken.updateMany({
        where: { sessionId: session.id, revokedAt: null },
        data: { revokedAt: now },
      });

      return { type: "replayed" };
    }

    const nextToken = generateRefreshToken();
    const nextExpiresAt = getRefreshExpiry();

    const newRecord = await tx.refreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash: hashRefreshToken(nextToken),
        expiresAt: nextExpiresAt,
      },
    });

    await tx.refreshToken.update({
      where: { id: oldToken.id },
      data: { replacedByTokenId: newRecord.id },
    });

    await tx.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: now },
    });

    return {
      type: "success",
      session,
      user: session.user,
      refreshToken: nextToken,
      refreshExpiresAt: nextExpiresAt,
    };
  });

  if (outcome.type !== "success") {
    throw new AuthError(
      "The refresh token is invalid or expired",
      401,
      outcome.type === "replayed"
        ? "REFRESH_TOKEN_REUSE"
        : "INVALID_REFRESH_TOKEN"
    );
  }

  const accessToken = await createAccessToken({
    userId: outcome.user.id,
    sessionId: outcome.session.id,
    organizationId: outcome.user.organizationId,
    role: outcome.user.role,
  });

  return {
    accessToken,
    refreshToken: outcome.refreshToken,
    refreshExpiresAt: outcome.refreshExpiresAt,
    user: publicUser(outcome.user),
  };
}

export async function logoutSession({ refreshToken }) {
  if (!refreshToken) {
    // Idempotent logout: a missing token does not reveal account data.
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.$transaction(async (tx) => {
    const token = await tx.refreshToken.findUnique({
      where: { tokenHash },
      select: { sessionId: true },
    });

    if (!token) {
      return;
    }

    const now = new Date();

    await tx.authSession.updateMany({
      where: { id: token.sessionId, revokedAt: null },
      data: { revokedAt: now },
    });

    await tx.refreshToken.updateMany({
      where: { sessionId: token.sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
}