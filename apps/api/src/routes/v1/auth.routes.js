import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";

import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  invitationAcceptanceSchema,
} from "../../modules/auth/auth.schemas.js";

import {
  login,
  logoutSession,
  refreshSession,
} from "../../modules/auth/auth.service.js";

import {
  authenticate,
  authorize,
} from "../../modules/auth/auth.middleware.js";

import {
  clearRefreshCookie,
  setRefreshCookie,
} from "../../modules/auth/auth.cookies.js";

import {
  acceptInvitation,
  createInvitation,
} from "../../modules/auth/auth.invitations.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: env.AUTH_LOGIN_WINDOW_MS,
  limit: env.AUTH_LOGIN_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "LOGIN_RATE_LIMITED",
      message: "Too many login attempts. Please try again later.",
    },
  },
});



const refreshLimiter = rateLimit({
  windowMs: env.AUTH_REFRESH_WINDOW_MS,
  limit: env.AUTH_REFRESH_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "REFRESH_RATE_LIMITED",
      message: "Too many refresh attempts. Please try again later.",
    },
  },
});

function sendError(res, req, error) {
  const status = Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;

  if (status >= 500) {
    req.log?.error(
      {
        err: error,
        requestId: req.id,
      },
      "Authentication request failed"
    );
  }

  return res.status(status).json({
    success: false,
    error: {
      code: error.code ?? "INTERNAL_SERVER_ERROR",
      message:
        status >= 500
          ? "An unexpected error occurred."
          : error.message,
    },
    requestId: req.id,
  });
}

function validateBody(schema, body) {
  return schema.safeParse(body);
}

function requireTrustedBrowserRequest(req, res, next) {
  const origin = req.get("origin");
  const cookieToken = req.cookies?.[env.AUTH_COOKIE_NAME];

  if (origin && !env.CORS_ORIGINS.includes(origin)) {
    return res.status(403).json({
      success: false,
      error: {
        code: "UNTRUSTED_ORIGIN",
        message: "This origin is not permitted.",
      },
      requestId: req.id,
    });
  }

  // Cookie-based refresh/logout requests must have a trusted Origin
  // and a custom header. Native clients can use the body-token flow.
  if (cookieToken) {
    if (
      !origin ||
      !env.CORS_ORIGINS.includes(origin) ||
      req.get("x-geofield-request") !== "1"
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: "CSRF_VALIDATION_FAILED",
          message: "The browser request could not be validated.",
        },
        requestId: req.id,
      });
    }
  }

  return next();
}

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = validateBody(loginSchema, req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the supplied login details.",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        requestId: req.id,
      });
    }

    const result = await login({
      ...parsed.data,
      req,
    });

    if (parsed.data.clientType === "web") {
      setRefreshCookie(
        res,
        result.refreshToken ??
          "",
        result.refreshExpiresAt
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        tokenType: "Bearer",
        expiresIn: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
        user: result.user,
        ...(parsed.data.clientType === "mobile"
          ? {
              refreshToken: result.refreshToken,
              refreshExpiresAt: result.refreshExpiresAt,
            }
          : {}),
      },
      requestId: req.id,
    });
  } catch (error) {
    return sendError(res, req, error);
  }
});

router.post(
  "/refresh",
  refreshLimiter,
  requireTrustedBrowserRequest,
  async (req, res) => {
    try {
      const parsed = validateBody(refreshSchema, req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "The refresh request is invalid.",
          },
          requestId: req.id,
        });
      }

      const isBrowserRequest = Boolean(
        req.cookies?.[env.AUTH_COOKIE_NAME]
      );

      const suppliedToken = isBrowserRequest
        ? req.cookies[env.AUTH_COOKIE_NAME]
        : parsed.data.refreshToken;

      const result = await refreshSession({
        refreshToken: suppliedToken,
      });

      if (isBrowserRequest) {
        setRefreshCookie(
          res,
          result.refreshToken,
          result.refreshExpiresAt
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          tokenType: "Bearer",
          expiresIn: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
          user: result.user,
          ...(!isBrowserRequest
            ? {
                refreshToken: result.refreshToken,
                refreshExpiresAt: result.refreshExpiresAt,
              }
            : {}),
        },
        requestId: req.id,
      });
    } catch (error) {
      clearRefreshCookie(res);
      return sendError(res, req, error);
    }
  }
);

router.post(
  "/logout",
  requireTrustedBrowserRequest,
  async (req, res) => {
    try {
      const parsed = validateBody(logoutSchema, req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "The logout request is invalid.",
          },
          requestId: req.id,
        });
      }

      const refreshToken =
        req.cookies?.[env.AUTH_COOKIE_NAME] ??
        parsed.data.refreshToken;

      await logoutSession({ refreshToken });

      clearRefreshCookie(res);

      return res.status(200).json({
        success: true,
        data: {
          message: "Session revoked.",
        },
        requestId: req.id,
      });
    } catch (error) {
      return sendError(res, req, error);
    }
  }
);


router.post(
  "/invitations",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().trim().email().max(320),
        role: z.enum([
          "SUPERVISOR",
          "GIS_ANALYST",
          "EMPLOYEE",
        ]),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "The invitation details are invalid.",
          },
          requestId: req.id,
        });
      }

      // Fail closed until a production email-delivery provider is configured.
      if (env.NODE_ENV === "production") {
        return res.status(503).json({
          success: false,
          error: {
            code: "INVITATION_DELIVERY_NOT_CONFIGURED",
            message:
              "Invitation delivery is not configured. Contact the system administrator.",
          },
          requestId: req.id,
        });
      }

      const result = await createInvitation({
        actor: req.auth,
        ...parsed.data,
      });

      res.set("Cache-Control", "no-store");

      return res.status(201).json({
        success: true,
        data: {
          invitation: result.invitation,
          // Development only. Do not expose invitation tokens in production.
          invitationToken: result.token,
        },
        requestId: req.id,
      });
    } catch (error) {
      return sendError(res, req, error);
    }
  }
);

router.post(
  "/accept-invitation",
  async (req, res) => {
    try {
      const parsed = invitationAcceptanceSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "The invitation details are invalid.",
          },
          requestId: req.id,
        });
      }

      const user = await acceptInvitation({
        token: parsed.data.token,
        name: parsed.data.name,
        password: parsed.data.password,
      });

      return res.status(201).json({
        success: true,
        data: {
          user,
          message: "Your account is active. You can now log in.",
        },
        requestId: req.id,
      });
    } catch (error) {
      return sendError(res, req, error);
    }
  }
);


router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        error: {
          code: "USER_NOT_ACTIVE",
          message: "The user session is no longer valid.",
        },
        requestId: req.id,
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
      requestId: req.id,
    });
  } catch (error) {
    return sendError(res, req, error);
  }
});

export default router;