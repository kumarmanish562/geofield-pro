import { prisma } from "../../database/prisma.js";
import { verifyAccessToken } from "./auth.tokens.js";

export async function authenticate(req, res, next) {
  try {
    const authorization = req.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
        requestId: req.id,
      });
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
        requestId: req.id,
      });
    }

    const claims = await verifyAccessToken(token);

    const session = await prisma.authSession.findFirst({
      where: {
        id: claims.sid,
        userId: claims.sub,
        organizationId: claims.org,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: {
          status: "ACTIVE",
          organization: {
            status: "ACTIVE",
          },
        },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: "SESSION_INVALID",
          message: "The session is no longer valid.",
        },
        requestId: req.id,
      });
    }

    req.auth = {
      userId: session.userId,
      sessionId: session.id,
      organizationId: session.organizationId,
      role: session.user.role,
      user: session.user,
    };

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_ACCESS_TOKEN",
        message: "Authentication is required.",
      },
      requestId: req.id,
    });
  }
}

export function authorize(...allowedRoles) {
  return function authorizeRole(req, res, next) {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
        requestId: req.id,
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
        requestId: req.id,
      });
    }

    return next();
  };
}