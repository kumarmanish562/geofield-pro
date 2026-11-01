import argon2 from "argon2";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";

import {
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./auth.tokens.js";
import { recordAuthEvent } from "./auth.audit.js";

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
    await recordAuthEvent({
      event: "AUTH_LOGIN_FAILED",
      req,
      metadata: { reason: "unknown_email" },
    });
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

    await recordAuthEvent({
      event: "AUTH_LOGIN_FAILED",
      actorUserId: user.id,
      organizationId: user.organizationId,
      req,
      metadata: { reason: "invalid_password" },
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

    const sessionResult = await createSession(tx, user, req);
    await recordAuthEvent({
      event: "AUTH_LOGIN_SUCCEEDED",
      actorUserId: user.id,
      organizationId: user.organizationId,
      req,
      client: tx,
    });
    return sessionResult;
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

export async function registerUser({
  organizationId,
  name,
  email,
  password,
  clientType,
  req,
}) {
  if (!env.ALLOW_PUBLIC_REGISTRATION) {
    throw new AuthError(
      "Public registration is disabled.",
      403,
      "REGISTRATION_DISABLED"
    );
  }

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!organization) {
    throw new AuthError(
      "The organization is not available.",
      400,
      "ORGANIZATION_UNAVAILABLE"
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });

  const user = await prisma.$transaction(async (tx) => {
    try {
      const created = await tx.user.create({
        data: {
          organizationId,
          name: name.trim(),
          email,
          passwordHash,
          role: "EMPLOYEE",
          status: "ACTIVE",
          passwordChangedAt: new Date(),
          employeeProfile: {
            create: { organizationId },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
        },
      });
      await recordAuthEvent({
        event: "AUTH_REGISTERED",
        actorUserId: created.id,
        organizationId,
        req,
        client: tx,
      });
      return created;
    } catch (error) {
      if (error.code === "P2002") {
        throw new AuthError(
          "An account already exists for this email address.",
          409,
          "USER_ALREADY_EXISTS"
        );
      }
      throw error;
    }
  });

  const sessionResult = await prisma.$transaction((tx) =>
    createSession(tx, user, req)
  );
  const accessToken = await createAccessToken({
    userId: user.id,
    sessionId: sessionResult.session.id,
    organizationId,
    role: user.role,
  });
  return {
    accessToken,
    refreshToken:
      clientType === "mobile" ? sessionResult.refreshToken : undefined,
    refreshExpiresAt: sessionResult.refreshExpiresAt,
    user: publicUser(user),
  };
}

export async function requestPasswordReset({ email, req }) {
  const genericMessage =
    "If an account exists, password reset instructions will be sent.";
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    await recordAuthEvent({
      event: "AUTH_PASSWORD_RESET_REQUESTED",
      req,
      metadata: { found: false },
    });
    return { message: genericMessage };
  }

  const token = generateRefreshToken();
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await recordAuthEvent({
      event: "AUTH_PASSWORD_RESET_REQUESTED",
      actorUserId: user.id,
      organizationId: user.organizationId,
      req,
      client: tx,
    });
  });

  return {
    message: genericMessage,
    ...(env.NODE_ENV === "production" ? {} : { resetToken: token }),
  };
}

export async function resetPassword({ token, password, req }) {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });

  const result = await prisma.$transaction(async (tx) => {
    const reset = await tx.passwordResetToken.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
      include: { user: true },
    });
    const now = new Date();

    if (
      !reset ||
      reset.usedAt ||
      reset.expiresAt <= now ||
      reset.user.status !== "ACTIVE"
    ) {
      return false;
    }

    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;

    await tx.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.authSession.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.refreshToken.updateMany({
      where: { session: { userId: reset.userId }, revokedAt: null },
      data: { revokedAt: now },
    });
    await recordAuthEvent({
      event: "AUTH_PASSWORD_RESET_COMPLETED",
      actorUserId: reset.userId,
      organizationId: reset.user.organizationId,
      req,
      client: tx,
    });
    return true;
  });

  if (!result) {
    throw new AuthError(
      "The password reset token is invalid or expired.",
      400,
      "RESET_TOKEN_INVALID"
    );
  }
}