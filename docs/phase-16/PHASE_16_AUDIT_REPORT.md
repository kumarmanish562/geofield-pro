# Phase 16 repository audit and implementation plan

## Audit scope and method

This is the pre-implementation audit required by Phase 16. It inventories the
repository and reviews the API route/middleware structure, authentication,
authorization scopes, Prisma schema and migrations, GIS/import paths,
attachments, offline sync, analytics, audit events, web/mobile session
handling, existing tests, Docker configuration, and GitHub Actions. It is a
source review plus baseline execution, not a penetration test or a production
database assessment. Production configuration, infrastructure, provider
credentials, and legal/privacy approval were not available.

The audit began on `phase-15-notification-management` at `8c9f238`; no
application code was changed before this report and the implementation plan
were prepared.

## Architecture review

- JavaScript pnpm workspace with Express API, Prisma/PostgreSQL/PostGIS,
  React/Vite admin web, and Expo/React Native employee app.
- API request path is Helmet, explicit credentialed CORS, cookies, request ID,
  Pino request logging, JSON parser (1 MiB), versioned routes, not-found, and
  centralized errors.
- Access JWTs are short-lived and checked against an active persisted session
  on every authenticated request. Refresh tokens are random, SHA-256 hashed in
  the database, rotated transactionally, and replay revokes the session.
- API route schemas generally use Zod; service queries commonly derive the
  organization from `req.auth` and scope records there. Raw SQL found uses
  Prisma tagged templates rather than string-built SQL.
- Database schema is migration-backed and includes organization IDs, indexes,
  uniqueness constraints, audit entities, location geography, offline sync,
  surveys/reviews, and notification delivery records.
- Admin Web keeps the access token in module memory and uses an HttpOnly
  refresh cookie. The app route guard checks authentication; the API remains
  responsible for role authorization.
- Employee Mobile stores refresh token and attendance queue data in
  SecureStore; survey drafts/sync queue use SQLite. API refresh calls are
  coalesced in one process.
- CI currently runs install, formatting, lint, application builds, and a
  PostGIS-backed API test job. It does not run web/mobile test suites, coverage,
  dependency audits, backup/restore checks, or accessibility checks.

## Functionality review

Implemented workflows include auth/invitations/password reset, employees and
teams, assignments and audits, attendance and corrections, tracking sessions
and observations, village boundary CRUD/import/export/spatial queries, surveys
and review, object-storage signed uploads, survey sync/conflicts, reports,
analytics, notifications, web pages, and mobile offline flows.

Known incomplete or constrained workflows:

- Several mobile screens remain explicit unavailable placeholders
  (`AssignmentFormScreen`, `CreateReportScreen`, `ReportDetailsScreen`).
- Offline attachment sync returns `READY_FOR_UPLOAD`; the actual upload flow
  uses the separate presigned S3 endpoint. Sync dashboard counters report
  pending attachment counts as zero rather than querying durable attachment
  state.
- The API has no mail provider, so email delivery is not implemented.
- Some analytics/report exports cap at a fixed record count; village GeoJSON
  export pages at 100 villages.
- There are no documented or automated PostgreSQL backup and restore
  procedures.
- Location retention, employee notice, and tracking-policy decisions remain
  deployment/product obligations in `docs/privacy/location-tracking-policy.md`.

## Baseline checks

Executed against the checked-out Phase 15 state:

- API Vitest: 43 tests, 41 passed and 2 failed because local PostgreSQL was
  unavailable. The failures were the existing password-reset DB test and
  readiness-when-healthy DB test. Docker daemon was unavailable.
- Mobile Vitest: passed (one test file; see detailed test coverage report).
- Repository ESLint: passed.
- Prisma schema validation: passed.
- Admin Web has no test command or configured component test suite.
- API tests emit request/error log output to stdout during execution; test
  output included malformed-body error details. See security findings.
- `pnpm` invocation itself was blocked by a permissions error opening the
  global package-manager store lock, so baseline tools were invoked from the
  workspace-local package binaries.
- Dependency audit and production build/restore checks have not yet been
  completed as part of this audit baseline.

## Principal risks and recommended fixes

1. **High — offline survey synchronization ownership.** `syncSurvey` locates
   records through globally unique client IDs, then returns or updates records
   without requiring the existing survey/event to belong to the authenticated
   employee and organization. Add owner-scoped lookups and regression tests.
2. **High — organization/record authorization coverage.** Existing tests
   mostly check anonymous requests and schema rules. Add multi-organization
   fixtures and exercise list/detail/mutation/export boundaries for high-risk
   resources.
3. **High — GIS validation and import robustness.** GeoJSON geometry fields
   begin as `unknown`; coordinate checking flattens serialized numbers and
   assumes pairs rather than structurally validating positions/rings. Add
   finite, dimensional, WGS84, geometry-type, feature/property, and bounded
   payload checks before PostGIS calls; test rollback and duplicate imports.
4. **Medium — attachment ownership/content validation.** Uploads rely on
   declared MIME type, size, and storage HEAD metadata. Content bytes are not
   sniffed/scanned, and offline attachment duplicate lookup is globally keyed
   without checking the existing attachment's survey/uploader scope. Bind
   dedupe to owner/survey and document the remaining provider-side content
   verification limitation.
5. **Medium — log redaction.** The error handler logs the raw error object;
   malformed JSON parser errors carry a `body` string. Add Pino redaction or a
   safe error projection and tests proving submitted credentials/tokens/body
   content do not reach logs.
6. **Medium — distributed abuse controls.** Login/reset/refresh limits use
   the default process-local memory store. Document reverse-proxy assumptions
   and make the rate-limit store configurable for multi-instance production.
7. **Medium — testing and CI gaps.** Add meaningful authorization/workflow
   tests, web/mobile tests, coverage reports/threshold policy, audit jobs, and
   keep the isolated PostGIS job. Do not set coverage targets until measured
   and meaningful coverage is available.
8. **Medium — backup/recovery and data lifecycle.** Define isolated backup and
   restore steps, PostGIS verification, encryption/access controls, retention,
   and test recovery without touching production data.

## Phase 16 implementation plan

1. **Contain verified high-risk record access:** scope sync duplicate and
   existing-record lookups to authenticated owner and organization; test
   non-owner replay/read/update and cross-organization attachment replay.
2. **Harden input and error handling:** structurally validate GeoJSON, enforce
   explicit size/feature limits, reject future location timestamps, constrain
   attachment retries and sanitize request error logging.
3. **Expand backend security tests:** authentication/session lifecycle,
   role/record/organization boundaries, attendance state, location session,
   import transactions, survey review, attachment ownership, and sync
   idempotency; use PostGIS service fixtures in CI.
4. **Configure frontend test infrastructure:** add a compatible web
   component test harness and mobile test coverage where existing dependencies
   allow; cover auth routing/API failures and offline/permission error paths.
5. **Add root test scripts and CI gates:** separate API/web/mobile tests,
   coverage output, production builds, and non-blocking or blocking dependency
   audit according to reviewed severity; keep test secrets synthetic.
6. **Perform dependency and operations review:** capture audit output, address
   only safely fixable vulnerabilities, write backup/restore runbook, and run
   restoration only against an isolated test database if available.
7. **Rerun checks and update all five reports:** report exact outcomes,
   untested controls, unresolved risks, and a GO/NO-GO recommendation.

## Scope boundaries

Do not replace architecture or broadly upgrade dependencies. Do not test with
production credentials, mutate production data, claim unexecuted tests, or
declare production readiness while critical/high findings or acceptance gaps
remain. If local PostgreSQL/Docker or network-dependent audits are unavailable,
record that limitation and make CI/deployment checks explicit.
