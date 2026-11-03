# Test coverage report

## Baseline execution

Initial baseline and Phase 16 verification are both recorded below. The full
API suite currently requires a local Postgres service for two tests; Docker
was unavailable here.

| Suite | Result | Notes |
| --- | --- | --- |
| API Vitest, local | 49 passed, 2 failed (51 total) | The two failures require PostgreSQL: password-reset DB behavior and healthy readiness. Local DB connection was refused; Docker daemon was unavailable. |
| API CI | Passed | PostgreSQL migrations, PostGIS checks, API build/tests, coverage execution, and isolated backup/restore all passed on commit `87a8590` in both push and pull-request runs. |
| API targeted security/GIS/location/attendance tests | 17 passed | Cross-owner sync, redacted logging, GIS structure, and future timestamps. |
| Admin Web | 3 passed | API client test suite configured and executed. |
| Employee Mobile | 5 passed | API/navigation and offline account-isolation web-store tests. |
| Repository ESLint | Passed | Workspace-local ESLint binary. |
| Prisma validation | Passed | Schema validated against the installed Prisma CLI. |
| Admin Web production build | Passed | Vite build completed; large-chunk advisory only. |
| Employee Mobile web export | Passed | Expo export completed after Metro compatibility update. |
| API coverage | Instrumented, report unavailable | Suite produced database-dependent failures; no coverage artifact was retained locally. CI uploads coverage. |
| Dependency audit | Passed high-severity gate | No high/critical production findings; 4 moderate and 1 low findings remain. |
| Backup/restore | Passed in CI | Isolated PostGIS restore, table counts, geometry EWKB digest, and PostGIS availability verified. Production backup controls remain unverified. |

The test output demonstrated that logger behavior should be checked: request
errors are serialized during Supertest runs. Test logs are noisy and not
currently configured with a silent test logger.

## Existing test inventory

### API

Phase 16 adds API regression coverage for selected auth boundaries, env validation, error handling,
health, assignment/attendance/location/village/workforce authentication and
schemas, survey/sync schemas, report export sanitization, and notifications.
Most are schema-level or anonymous-request tests. There are no broad DB-backed
tests for tenant A versus tenant B, token lifecycle, successful workflows,
file storage, GIS import rollback, attendance concurrency, or sync recovery.

### Admin Web

API-client tests now execute (3 tests). No configured React component
tests cover login/session restoration, protected routes, forms, tables, KPI
views, notifications, filters, empty/error/loading states, or role-scoped data.

### Employee Mobile

API/navigation/offline-isolation tests now execute (5 tests). No configured tests cover auth
and refresh, navigation, attendance, survey validation/drafts, SQLite sync,
permissions, push navigation, or offline recovery.

## Coverage percentages and targets

No coverage percentages are available from the executed baseline; reporting a
percentage without an executed coverage instrument would be misleading. The
brief's targets (API 80%, auth/authorization 90%, admin/mobile 70%) are goals,
not achieved values. Critical organization-isolation scenarios should have
explicit scenario coverage and must not be represented by an aggregate
percentage alone.

## Priority gaps

1. Cross-organization list/detail/create/update/delete/search/export and
   analytics access for employees, assignments, attendance, locations,
   surveys, attachments, villages, and notifications.
2. Login failures, disabled accounts, JWT expiry/invalidity, refresh rotation,
   reuse, revocation, concurrent refresh, logout, and rate limiting.
3. Assignment visibility/reassignment and attendance state/idempotency under
   duplicate and concurrent requests.
4. Location session authorization, coordinate/timestamp edge cases, history
   scope, and GIS longitude/latitude handling.
5. GeoJSON structure, invalid/empty/large imports, duplicate codes, and
   transactional rollback.
6. Survey ownership, required values, submit/review transitions, and
   organization scope.
7. Attachment ownership, signed upload metadata, disallowed content, and
   cross-organization download.
8. Sync idempotency, duplicate replay, cross-owner client IDs, conflicts,
   retries, and partial recovery.
9. Web and mobile auth/session flows, API errors, validation, offline state,
   permission denial, and safe rendering.
10. Backup/restore, migration upgrade, dependency audit, and CI coverage.

## Test design policy

Tests should assert meaningful data ownership, returned state, audit effects,
and non-disclosure. Use synthetic users/tokens and isolated PostgreSQL/PostGIS.
Do not add tests that depend on production secrets or silently skip required
database assertions. Coverage thresholds should be introduced only after a
repeatable coverage run is available.
