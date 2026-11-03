# Phase 13 — Survey Review and Reports

Phase 13 adds an authorized survey review workflow on top of the Phase 12
offline synchronization foundation.

## Backend

- Reviewers can list and inspect surveys through `/api/v1/survey-reviews`.
- Approve, reject, and correction-request actions are transactional.
- Review history is immutable and stores action, actor, previous status, new
  status, comments, and timestamp.
- Employees can edit `CORRECTION_REQUIRED` surveys and resubmit them
  idempotently through `/api/v1/surveys/:id/resubmit`.
- Supervisor access is limited to supervised assignments.
- Attachment access is organization, ownership, and assignment scoped and is
  audit logged.

## Reports

- `/api/v1/reports/surveys/summary` returns totals and village/employee
  breakdowns.
- `/api/v1/reports/surveys` returns authorized report rows.
- CSV and Excel-compatible workbook exports are available under
  `/api/v1/reports/surveys/export`.
- Export filters include dates, village, employee, assignment, reviewer, and
  status. Spreadsheet formula values are neutralized.

## User interfaces

- Admin survey queue supports search, status filtering, approval, rejection,
  correction requests, details, and review history.
- Admin reports show summary cards, village/employee statistics, and
  authenticated CSV/Excel downloads.
- Employee mobile shows review status/history, correction instructions, editing,
  and resubmission.

## Validation

```powershell
pnpm --filter @geofield/api exec prisma validate
pnpm --filter @geofield/api test -- tests/phase13.test.js tests/sync.schemas.test.js
pnpm lint
pnpm format:check
pnpm build:all
```

Apply the migration in a PostgreSQL/PostGIS environment with:

```powershell
pnpm db:deploy
```
