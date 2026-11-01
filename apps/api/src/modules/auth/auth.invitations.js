import argon2 from "argon2";
import { randomBytes } from "node:crypto";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { hashRefreshToken } from "./auth.tokens.js";
import { AuthError } from "./auth.service.js";

const INVITATION_TTL_HOURS = 24;

const ALLOWED_INVITATION_ROLES = {
  ADMIN: ["SUPERVISOR", "GIS_ANALYST", "EMPLOYEE"],
  SUPERVISOR: ["EMPLOYEE"],
  GIS_ANALYST: [],
  EMPLOYEE: [],
};

export async function createInvitation({
  actor,
  email,
  role,
}) {
  const normalizedEmail = email.trim().toLowerCase();

  const allowedRoles = ALLOWED_INVITATION_ROLES[actor.role] ?? [];

  if (!allowedRoles.includes(role)) {
    throw new AuthError(
      "You are not permitted to invite this role.",
      403,
      "INVITATION_ROLE_FORBIDDEN"
    );
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: actor.organizationId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!organization) {
    throw new AuthError(
      "The organization is not active.",
      403,
      "ORGANIZATION_INACTIVE"
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    throw new AuthError(
      "An account already exists for this email address.",
      409,
      "USER_ALREADY_EXISTS"
    );
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000
  );

  const invitation = await prisma.$transaction(async (tx) => {
    // Revoke prior pending invitations for this email in this organization.
    await tx.organizationInvitation.updateMany({
      where: {
        organizationId: actor.organizationId,
        email: normalizedEmail,
        status: "PENDING",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    return tx.organizationInvitation.create({
      data: {
        organizationId: actor.organizationId,
        invitedById: actor.userId,
        email: normalizedEmail,
        role,
        tokenHash,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
      },
    });
  });

  return {
    invitation,
    token,
  };
}

export async function acceptInvitation({
  token,
  name,
  password,
}) {
  const tokenHash = hashRefreshToken(token);

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });

  const result = await prisma.$transaction(async (tx) => {
    const invitation = await tx.organizationInvitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
      },
    });

    const now = new Date();

    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.expiresAt <= now ||
      invitation.revokedAt ||
      invitation.organization.status !== "ACTIVE"
    ) {
      return { type: "invalid" };
    }

    // Claim the invitation once to prevent duplicate acceptance.
    const claimed = await tx.organizationInvitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    if (claimed.count !== 1) {
      return { type: "invalid" };
    }

    const existingUser = await tx.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new AuthError(
        "An account already exists for this email address.",
        409,
        "USER_ALREADY_EXISTS"
      );
    }

    const user = await tx.user.create({
      data: {
        organizationId: invitation.organizationId,
        name: name.trim(),
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        status: "ACTIVE",
        passwordChangedAt: now,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    return {
      type: "success",
      user,
    };
  });

  if (result.type !== "success") {
    throw new AuthError(
      "The invitation is invalid, expired, or already used.",
      400,
      "INVITATION_INVALID"
    );
  }

  return result.user;
}