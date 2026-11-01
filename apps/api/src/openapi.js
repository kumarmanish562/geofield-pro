import { env } from "./config/env.js";

const openApiDocument = {
  openapi: "3.0.3",

  info: {
    title: "GeoField Pro API",
    version: "0.1.0",
    description:
      "Backend foundation API for the GeoField Pro field workforce platform."
  },

  servers: [
    {
      url: "/",
      description: "Current server"
    }
  ],

  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "requestId"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" }
            }
          },
          requestId: { type: "string", format: "uuid" }
        }
      }
    }
  },

  paths: {
    [`${env.API_PREFIX}/health`]: {
      get: {
        summary: "Check API process health",
        responses: {
          "200": {
            description: "API process is responding."
          }
        }
      }
    },

    [`${env.API_PREFIX}/ready`]: {
      get: {
        summary: "Check API readiness",
        responses: {
          "200": {
            description: "Required database dependency is reachable."
          },
          "503": {
            description: "A required dependency is unavailable."
          }
        }
      }
    },

    [`${env.API_PREFIX}/docs`]: {
      get: {
        summary: "Open Swagger UI",
        responses: {
          "200": {
            description: "Swagger UI is available."
          }
        }
      }
    },

    [`${env.API_PREFIX}/auth/login`]: {
      post: {
        summary: "Authenticate a user",
        responses: {
          "200": { description: "Authentication succeeded." },
          "400": { $ref: "#/components/schemas/ErrorResponse" },
          "401": { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    },

    [`${env.API_PREFIX}/auth/register`]: {
      post: {
        summary: "Register an employee when public registration is enabled",
        responses: {
          "201": { description: "Account created." },
          "403": { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    },

    [`${env.API_PREFIX}/auth/forgot-password`]: {
      post: {
        summary: "Request password reset instructions",
        responses: {
          "200": { description: "A generic reset response was returned." }
        }
      }
    },

    [`${env.API_PREFIX}/auth/reset-password`]: {
      post: {
        summary: "Set a new password with a reset token",
        responses: {
          "200": { description: "Password reset completed." },
          "400": { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    },

    [`${env.API_PREFIX}/auth/refresh`]: {
      post: {
        summary: "Rotate a refresh token",
        responses: {
          "200": { description: "Tokens were rotated." },
          "401": { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    },

    [`${env.API_PREFIX}/auth/logout`]: {
      post: {
        summary: "Revoke a session",
        responses: {
          "200": { description: "Session was revoked." },
          "401": { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    },

    [`${env.API_PREFIX}/auth/me`]: {
      get: {
        summary: "Get the authenticated user",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Authenticated user returned." },
          "401": { $ref: "#/components/schemas/ErrorResponse" }
        }
      },

      [`${env.API_PREFIX}/workforce/employees`]: {
        get: {
          summary: "List organization workforce records",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } }
          ],
          responses: {
            "200": { description: "Paginated workforce records returned." },
            "401": { $ref: "#/components/schemas/ErrorResponse" },
            "403": { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },

      [`${env.API_PREFIX}/workforce/employees/{userId}`]: {
        get: {
          summary: "Get an employee profile",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": { description: "Employee profile returned." },
            "404": { $ref: "#/components/schemas/ErrorResponse" }
          }
        },
        patch: {
          summary: "Update permitted employee fields",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": { description: "Employee profile updated." },
            "400": { $ref: "#/components/schemas/ErrorResponse" },
            "403": { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },

      [`${env.API_PREFIX}/workforce/employees/invitations`]: {
        post: {
          summary: "Create an employee invitation",
          security: [{ BearerAuth: [] }],
          responses: {
            "201": { description: "Invitation created in non-production environments." },
            "503": { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },

      [`${env.API_PREFIX}/workforce/teams`]: {
        get: {
          summary: "List organization teams",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Teams returned." } }
        },
        post: {
          summary: "Create an organization team",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Team created." } }
        }
      }
    }
  }
};

export default openApiDocument;