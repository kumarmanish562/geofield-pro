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
    [`${env.API_PREFIX}/analytics/overview`]: {
      get: { summary: "Get organization dashboard KPIs", description: "Authenticated ADMIN, SUPERVISOR, or GIS_ANALYST. Organization scoped; returns documented persisted-data counts. Accepts startDate, endDate, and teamId filters.", security: [{ BearerAuth: [] }], responses: { "200": { description: "KPI metrics and definitions." }, "403": { description: "Role is not allowed." } } }
    },
    [`${env.API_PREFIX}/analytics/attendance`]: {
      get: { summary: "Get attendance trends and paginated records", description: "Accepts startDate, endDate, teamId, page, pageSize (maximum 100). Trend counts records by attendance date and current status. Work-session duration uses completed sessions only and subtracts recorded breaks.", security: [{ BearerAuth: [] }], responses: { "200": { description: "Attendance trend, duration, records, pagination, and calculation definitions." } } }
    },
    [`${env.API_PREFIX}/analytics/assignments`]: {
      get: { summary: "Get assignment progress", description: "Accepts startDate, endDate, teamId, page, pageSize (maximum 100). Progress compares persisted surveys with configured numeric targets; missing targets yield null percentages.", security: [{ BearerAuth: [] }], responses: { "200": { description: "Paginated measured assignment progress." } } }
    },
    [`${env.API_PREFIX}/analytics/surveys`]: {
      get: { summary: "Get survey analytics", description: "Accepts startDate, endDate, teamId, page, pageSize (maximum 100). Approval rate is approved / (approved + rejected); pending and correction-required records are excluded.", security: [{ BearerAuth: [] }], responses: { "200": { description: "Status totals, village counts, approval rate, drill-down, and pagination." } } }
    },
    [`${env.API_PREFIX}/analytics/village-coverage`]: {
      get: { summary: "Get village survey activity", description: "Accepts startDate, endDate, teamId, page, pageSize (maximum 100). Activity means persisted matching surveys; no population denominator is available.", security: [{ BearerAuth: [] }], responses: { "200": { description: "Paginated active villages with survey counts." } } }
    },
    [`${env.API_PREFIX}/analytics/locations`]: {
      get: { summary: "Get location data quality and freshness", description: "Accepts startDate, endDate, teamId, page, pageSize. Poor accuracy means greater than 100m. Delayed upload means capturedAt is more than five minutes before receivedAt. Stale means latest received observation is more than five minutes old; it does not establish device offline state.", security: [{ BearerAuth: [] }], responses: { "200": { description: "Quality counts, delayed uploads, and paginated stale employees." } } }
    },
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
      },
      [`${env.API_PREFIX}/assignments`]: {
        get: { summary: "List organization or employee assignments", security: [{ BearerAuth: [] }], responses: { "200": { description: "Assignments returned." } } },
        post: { summary: "Create a draft assignment", security: [{ BearerAuth: [] }], responses: { "201": { description: "Assignment created." }, "403": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/assignments/{id}`]: {
        get: { summary: "Get an authorized assignment", security: [{ BearerAuth: [] }], responses: { "200": { description: "Assignment returned." }, "404": { $ref: "#/components/schemas/ErrorResponse" } } },
        patch: { summary: "Update an assignment", security: [{ BearerAuth: [] }], responses: { "200": { description: "Assignment updated." }, "409": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/me/assignments`]: {
        get: { summary: "List assignments for the authenticated employee", security: [{ BearerAuth: [] }], responses: { "200": { description: "Published employee assignments returned." } } }
      },
      [`${env.API_PREFIX}/attendance/check-in`]: {
        post: { summary: "Start the authenticated employee attendance session", security: [{ BearerAuth: [] }], parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }], responses: { "201": { description: "Attendance started." }, "409": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/attendance/break/start`]: {
        post: { summary: "Start a break", security: [{ BearerAuth: [] }], responses: { "200": { description: "Break started." } } }
      },
      [`${env.API_PREFIX}/attendance/break/end`]: {
        post: { summary: "End the active break", security: [{ BearerAuth: [] }], responses: { "200": { description: "Break ended." } } }
      },
      [`${env.API_PREFIX}/attendance/check-out`]: {
        post: { summary: "Complete the authenticated employee attendance session", security: [{ BearerAuth: [] }], responses: { "200": { description: "Attendance completed." } } }
      },
      [`${env.API_PREFIX}/attendance/current`]: {
        get: { summary: "Get the current employee attendance session", security: [{ BearerAuth: [] }], responses: { "200": { description: "Current attendance or null." } } }
      },
      [`${env.API_PREFIX}/attendance/history`]: {
        get: { summary: "List authenticated employee attendance history", security: [{ BearerAuth: [] }], responses: { "200": { description: "Paginated attendance history." } } }
      },
      [`${env.API_PREFIX}/attendance/sync`]: {
        post: { summary: "Synchronize ordered offline attendance events", security: [{ BearerAuth: [] }], responses: { "200": { description: "Each event is reported as processed or rejected." } } }
      },
      [`${env.API_PREFIX}/admin/attendance`]: {
        get: { summary: "List organization attendance", security: [{ BearerAuth: [] }], responses: { "200": { description: "Paginated organization attendance." } } }
      },
      [`${env.API_PREFIX}/admin/attendance/summary`]: {
        get: { summary: "Get today's attendance summary", security: [{ BearerAuth: [] }], responses: { "200": { description: "Attendance summary." } } }
      },
      [`${env.API_PREFIX}/locations`]: {
        post: {
          summary: "Submit an authorized employee location observation",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Location persisted." }, "403": { $ref: "#/components/schemas/ErrorResponse" } }
        }
      },
      [`${env.API_PREFIX}/locations/me`]: {
        get: {
          summary: "List the authenticated employee location history",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Paginated location history." } }
        }
      },
      [`${env.API_PREFIX}/locations/session/current`]: {
        get: {
          summary: "Get the authenticated employee active tracking session",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Active session or null." } }
        }
      },
      [`${env.API_PREFIX}/admin/locations/latest`]: {
        get: {
          summary: "List the latest location for each active employee",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Organization-scoped latest locations." } }
        }
      },
      [`${env.API_PREFIX}/admin/locations/history`]: {
        get: {
          summary: "List organization location history",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Paginated location history." } }
        }
      },
      [`${env.API_PREFIX}/admin/locations/sessions`]: {
        get: {
          summary: "List organization tracking sessions",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Tracking sessions returned." } }
        },
        post: {
          summary: "Authorize an employee tracking session",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Tracking session started." } }
        }
      },
      [`${env.API_PREFIX}/admin/locations/sessions/{sessionId}/end`]: {
        post: {
          summary: "End an employee tracking session",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Tracking session ended." } }
        }
      },
      [`${env.API_PREFIX}/villages`]: {
        get: { summary: "List authorized villages", security: [{ BearerAuth: [] }], responses: { "200": { description: "Paginated villages." } } },
        post: { summary: "Create a village", security: [{ BearerAuth: [] }], responses: { "201": { description: "Village created." }, "403": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/villages/{id}`]: {
        get: { summary: "Get a village and boundary metadata", security: [{ BearerAuth: [] }], responses: { "200": { description: "Village returned." } } },
        patch: { summary: "Update village metadata", security: [{ BearerAuth: [] }], responses: { "200": { description: "Village updated." } } }
      },
      [`${env.API_PREFIX}/villages/imports/geojson`]: {
        post: { summary: "Import validated GeoJSON village boundaries", security: [{ BearerAuth: [] }], responses: { "201": { description: "Import result returned." }, "400": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/villages/imports`]: {
        get: { summary: "List village import history", security: [{ BearerAuth: [] }], responses: { "200": { description: "Import history returned." } } }
      },
      [`${env.API_PREFIX}/villages/{id}/export`]: {
        get: { summary: "Export one village boundary as GeoJSON", security: [{ BearerAuth: [] }], responses: { "200": { description: "GeoJSON Feature returned." } } }
      },
      [`${env.API_PREFIX}/villages/export`]: {
        get: { summary: "Export authorized village boundaries", security: [{ BearerAuth: [] }], responses: { "200": { description: "GeoJSON FeatureCollection returned." } } }
      },
      [`${env.API_PREFIX}/villages/spatial/point`]: {
        get: { summary: "Find villages covering a WGS84 point", security: [{ BearerAuth: [] }], responses: { "200": { description: "Matching villages returned." } } }
      },
      [`${env.API_PREFIX}/villages/spatial/intersections`]: {
        post: { summary: "Find villages intersecting a GeoJSON geometry", security: [{ BearerAuth: [] }], responses: { "200": { description: "Intersecting villages returned." } } }
      },
      [`${env.API_PREFIX}/surveys`]: {
        get: { summary: "List surveys visible to the authenticated user", security: [{ BearerAuth: [] }], responses: { "200": { description: "Paginated surveys returned." } } },
        post: { summary: "Create a field survey draft", security: [{ BearerAuth: [] }], responses: { "201": { description: "Survey draft created." }, "400": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/surveys/stats`]: {
        get: { summary: "Get organization survey status counts", security: [{ BearerAuth: [] }], responses: { "200": { description: "Survey counts returned." } } }
      },
      [`${env.API_PREFIX}/surveys/{id}`]: {
        get: { summary: "Get a survey", security: [{ BearerAuth: [] }], responses: { "200": { description: "Survey returned." } } },
        patch: { summary: "Update a survey draft", security: [{ BearerAuth: [] }], responses: { "200": { description: "Survey updated." } } },
        delete: { summary: "Delete a survey draft", security: [{ BearerAuth: [] }], responses: { "204": { description: "Draft deleted." } } }
      },
      [`${env.API_PREFIX}/surveys/{id}/submit`]: {
        post: { summary: "Submit a survey idempotently", security: [{ BearerAuth: [] }], parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }], responses: { "200": { description: "Server-confirmed submission returned." }, "409": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/surveys/{id}/resubmit`]: {
        post: { summary: "Resubmit a corrected survey idempotently", security: [{ BearerAuth: [] }], parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }], responses: { "200": { description: "Resubmitted survey returned." }, "409": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/survey-reviews`]: {
        get: { summary: "List authorized survey reviews", security: [{ BearerAuth: [] }], responses: { "200": { description: "Review queue returned." } } }
      },
      [`${env.API_PREFIX}/survey-reviews/{id}/approve`]: {
        post: { summary: "Approve a survey", security: [{ BearerAuth: [] }], responses: { "200": { description: "Survey approved." } } }
      },
      [`${env.API_PREFIX}/survey-reviews/{id}/reject`]: {
        post: { summary: "Reject a survey with a reason", security: [{ BearerAuth: [] }], responses: { "200": { description: "Survey rejected." } } }
      },
      [`${env.API_PREFIX}/survey-reviews/{id}/request-correction`]: {
        post: { summary: "Request survey corrections", security: [{ BearerAuth: [] }], responses: { "200": { description: "Correction request recorded." } } }
      },
      [`${env.API_PREFIX}/survey-reviews/{id}/history`]: {
        get: { summary: "Get immutable survey review history", security: [{ BearerAuth: [] }], responses: { "200": { description: "Review history returned." } } }
      },
      [`${env.API_PREFIX}/reports/surveys/summary`]: {
        get: { summary: "Get survey report summary", security: [{ BearerAuth: [] }], responses: { "200": { description: "Report summary returned." } } }
      },
      [`${env.API_PREFIX}/reports/surveys/export/csv`]: {
        get: { summary: "Export authorized survey data as CSV", security: [{ BearerAuth: [] }], responses: { "200": { description: "CSV report returned." } } }
      },
      [`${env.API_PREFIX}/reports/surveys/export/excel`]: {
        get: { summary: "Export authorized survey data as Excel-compatible workbook", security: [{ BearerAuth: [] }], responses: { "200": { description: "Excel report returned." } } }
      },
      [`${env.API_PREFIX}/sync/surveys`]: {
        post: { summary: "Synchronize an offline survey idempotently", security: [{ BearerAuth: [] }], responses: { "200": { description: "Synchronization result returned." }, "409": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/sync/attachments`]: {
        post: { summary: "Register an offline attachment for upload", security: [{ BearerAuth: [] }], responses: { "200": { description: "Attachment upload readiness returned." } } }
      },
      [`${env.API_PREFIX}/sync/status`]: {
        get: { summary: "Get employee synchronization counts", security: [{ BearerAuth: [] }], responses: { "200": { description: "Synchronization status returned." } } }
      },
      [`${env.API_PREFIX}/sync/history`]: {
        get: { summary: "List employee synchronization history", security: [{ BearerAuth: [] }], responses: { "200": { description: "Synchronization history returned." } } }
      },
      [`${env.API_PREFIX}/sync/conflicts`]: {
        get: { summary: "List unresolved synchronization conflicts", security: [{ BearerAuth: [] }], responses: { "200": { description: "Conflicts returned." } } }
      },
      [`${env.API_PREFIX}/sync/conflicts/{eventId}/resolve`]: {
        post: { summary: "Resolve a synchronization conflict explicitly", security: [{ BearerAuth: [] }], responses: { "200": { description: "Conflict resolved." }, "409": { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      [`${env.API_PREFIX}/admin/surveys/review-queue`]: {
        get: { summary: "List surveys awaiting review", security: [{ BearerAuth: [] }], responses: { "200": { description: "Review queue returned." } } }
      },
      [`${env.API_PREFIX}/admin/surveys/{id}/review`]: {
        patch: { summary: "Approve or reject a submitted survey", security: [{ BearerAuth: [] }], responses: { "200": { description: "Review result returned." }, "403": { $ref: "#/components/schemas/ErrorResponse" } } }
      }
  }
};

export default openApiDocument;
