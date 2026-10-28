# GeoField Pro — API Conventions

## 1. API Base Path

All version-one API endpoints use:

/api/v1

Example:

GET /api/v1/assignments

## 2. HTTP Methods

- GET: retrieve resources.
- POST: create resources or initiate operations.
- PUT: replace a resource when replacement semantics are appropriate.
- PATCH: partially update a resource.
- DELETE: delete or deactivate a resource according to the documented contract.

## 3. Naming

- Use plural nouns for collections.
- Use stable resource identifiers.
- Use lowercase paths with hyphens where needed.
- Avoid embedding business logic in route names.

Examples:

GET /api/v1/users
GET /api/v1/teams
GET /api/v1/assignments
POST /api/v1/assignments
GET /api/v1/surveys/:surveyId

## 4. Success Response

Use a consistent response format.

Example:

{
  "success": true,
  "data": {
    "id": "resource-id"
  }
}

Collection endpoints may include pagination metadata.

## 5. Error Response

Use a consistent error format.

Example:

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": []
  },
  "requestId": "request-id"
}

Do not return stack traces, database credentials, tokens, or internal secrets.

## 6. HTTP Status Codes

- 200: successful request.
- 201: resource created.
- 202: request accepted for asynchronous processing.
- 204: successful operation without a response body.
- 400: invalid request.
- 401: authentication required or invalid.
- 403: insufficient permission.
- 404: resource not found or deliberately concealed.
- 409: conflict or invalid concurrent state.
- 422: semantically invalid input when this convention is selected.
- 429: rate limit exceeded.
- 500: unexpected server error.
- 503: service temporarily unavailable.

Use status codes consistently across modules.

## 7. Authentication

Protected endpoints require valid authentication.

Authorization must verify:
- Account status.
- Required permissions.
- Organization scope.
- Resource ownership or access.
- Relevant privacy restrictions.

Refresh-token handling must follow the security policy.

## 8. Request Validation

Use Zod to validate:
- Request bodies.
- Path parameters.
- Query parameters.
- Environment configuration.
- External integration payloads where appropriate.

Reject invalid data before executing business operations.

## 9. Pagination

Collection endpoints should support documented pagination.

Example:

GET /api/v1/assignments?page=1&limit=20

Rules:
- Define a maximum page size.
- Return consistent pagination metadata.
- Use stable sorting.
- Consider cursor pagination for large or frequently changing datasets.

## 10. Filtering and Sorting

Filtering and sorting must use explicitly supported fields.

Do not interpolate arbitrary user-provided SQL fragments.

Example:

GET /api/v1/assignments?status=IN_PROGRESS&sortBy=createdAt&sortOrder=desc

## 11. Date and Time

- Store event timestamps consistently in UTC.
- Use ISO 8601 timestamps in API contracts.
- Distinguish event time from server-record time.
- Define behavior for offline events and incorrect device clocks.

## 12. GIS Endpoints

Potential endpoints:

GET /api/v1/villages
GET /api/v1/villages/:villageId
POST /api/v1/villages
PATCH /api/v1/villages/:villageId
POST /api/v1/villages/import

GIS endpoints must validate geometry, coordinate systems, and permissions.

Do not return unnecessarily detailed geographic data.

## 13. Authentication Endpoints

Potential endpoints:

POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/accept-invitation

## 14. Workforce Endpoints

Potential endpoints:

GET /api/v1/users
POST /api/v1/users/invitations
GET /api/v1/teams
POST /api/v1/teams
GET /api/v1/assignments
POST /api/v1/assignments
PATCH /api/v1/assignments/:assignmentId

## 15. Attendance Endpoints

Potential endpoints:

POST /api/v1/attendance/check-in
POST /api/v1/attendance/check-out
POST /api/v1/attendance/breaks/start
POST /api/v1/attendance/breaks/end
GET /api/v1/attendance

The final routes must enforce valid state transitions and idempotency.

## 16. Location Endpoints

Potential endpoints:

POST /api/v1/locations
GET /api/v1/locations
GET /api/v1/locations/active

Access must be restricted according to the location-tracking policy.

## 17. Survey Endpoints

Potential endpoints:

GET /api/v1/surveys
POST /api/v1/surveys
GET /api/v1/surveys/:surveyId
PATCH /api/v1/surveys/:surveyId
POST /api/v1/surveys/:surveyId/submit
POST /api/v1/surveys/:surveyId/attachments
POST /api/v1/surveys/:surveyId/reviews

Define separate contracts for survey templates if required.

## 18. Offline Synchronization

Synchronization endpoints must define:
- Operation identifiers.
- Idempotency behavior.
- Accepted operations.
- Rejected operations.
- Conflict handling.
- Retry behavior.
- Server-generated timestamps.
- Per-operation outcomes.

Repeated requests must not create duplicate business records.

## 19. File Uploads

- Enforce size limits.
- Validate file content.
- Use private storage.
- Authorize access.
- Avoid trusting filenames.
- Define upload and retry behavior.

## 20. OpenAPI

Document:
- Routes.
- Request schemas.
- Response schemas.
- Authentication requirements.
- Status codes.
- Error responses.
- Pagination.
- Idempotency.
- GIS formats.

The published API specification must match actual implementation.

## 21. API Acceptance Criteria

- All routes use the versioned base path.
- All inputs are validated.
- Protected routes enforce authorization.
- Errors follow a consistent format.
- Sensitive information is not leaked.
- Tenant isolation is tested.
- OpenAPI documentation is maintained.