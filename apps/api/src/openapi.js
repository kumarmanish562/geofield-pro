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
      }
    }
  }
};

export default openApiDocument;