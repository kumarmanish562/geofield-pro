# Phase 06 Handoff — Employee and Team Management

## Status

Implemented on `phase-06-employee-team-management`.

## Delivered

- Organization-scoped `EmployeeProfile`, `Team`, and `TeamMembership` models.
- Supervisor links for employee profiles and teams.
- Employee search, status filtering, pagination, detail retrieval, and permitted profile updates.
- Administrator-only employee invitations through `/api/v1/workforce/employees/invitations`.
- Team creation, updates, listing, member addition, and member removal.
- Audit events for invitations, employee changes, team changes, and membership changes.
- Admin web employee directory, employee details, invitation dialog, teams page, and account status controls.
- Existing authentication-created users now receive employee profiles automatically.

## API

- `GET /api/v1/workforce/employees`
- `POST /api/v1/workforce/employees/invitations`
- `GET /api/v1/workforce/employees/:userId`
- `PATCH /api/v1/workforce/employees/:userId`
- `GET /api/v1/workforce/teams`
- `POST /api/v1/workforce/teams`
- `PATCH /api/v1/workforce/teams/:teamId`
- `POST /api/v1/workforce/teams/:teamId/members`
- `DELETE /api/v1/workforce/teams/:teamId/members/:userId`

All management mutations require an authenticated `ADMIN` in the same
organization. Client-supplied role and organization fields are rejected by
strict Zod schemas and are never accepted as update properties.

## Migration

`20261101211500_add_employee_profiles_and_teams`

## Current limitation

Invitation delivery is intentionally fail-closed in production until an email
provider is configured. Development responses expose an invitation token for
local testing only. Team supervisor selection, employee profile edits, and team
membership assignment/removal are available in the admin UI. Bulk membership
operations and email delivery remain future refinements.

## Validation

- Prisma client generation passed.
- Prisma migration deployment and status passed.
- Backend tests passed.
- Admin web tests passed.
- Formatting and ESLint passed.
- API, admin web, and mobile builds passed.

## Next phase

Implement assignment management and employee-to-assignment allocation using the
organization and team boundaries established here.
