# Phase 07 Handoff — Assignment Management

## Status

Implemented on `phase-07-assignment-management`.

## Delivered

- Organization-scoped assignments with draft, published, paused, completed, and cancelled states.
- Assignment employee membership with duplicate protection and organization checks.
- Supervisor ownership enforcement for assignment management.
- Transactional assignment creation, lifecycle transitions, membership changes, and audit records.
- Admin web assignment directory, draft creation, details, employee selection, and lifecycle actions.
- Employee mobile assignment list and authorized assignment details.
- OpenAPI entries for assignment and employee assignment endpoints.

## API

- `GET /api/v1/assignments`
- `POST /api/v1/assignments`
- `GET /api/v1/assignments/:id`
- `PATCH /api/v1/assignments/:id`
- `POST /api/v1/assignments/:id/employees`
- `DELETE /api/v1/assignments/:id/employees/:employeeId`
- `POST /api/v1/assignments/:id/publish`
- `POST /api/v1/assignments/:id/pause`
- `POST /api/v1/assignments/:id/resume`
- `POST /api/v1/assignments/:id/complete`
- `POST /api/v1/assignments/:id/cancel`
- `GET /api/v1/assignments/:id/audit-logs`
- `GET /api/v1/me/assignments`
- `GET /api/v1/me/assignments/:id`

Employees only receive published or paused assignments for their own membership.
Drafts and unrelated assignment IDs return not found to employee requests.

## Migration

`20261101160028_add_assignments`

The migration preserves existing data and was applied successfully to the local
PostgreSQL database.

## Validation

- Prisma generation and migration deployment passed.
- API tests passed, including unauthenticated access and strict schema checks.
- Admin web tests passed.
- API, admin web, and Expo mobile builds passed.
- Formatting and ESLint passed.

## Limitations

Village/PostGIS references are not added because the current repository has no
Village model or spatial work-area table yet. Assignments therefore store a
validated `workArea` label until the GIS village phase introduces that relation.
Survey progress is not fabricated; targets and survey requirements are stored,
but completion metrics will be connected when survey submissions exist.

## Next phase

Implement village and spatial work-area management, then connect assignments to
authorized village geometry and survey progress.
