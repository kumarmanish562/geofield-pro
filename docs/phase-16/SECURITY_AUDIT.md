# Security audit

## Assessment scope

Static review of the checked-out application code and existing automated
checks. This is not an external penetration test, infrastructure assessment,
formal threat model, or legal/privacy review. Statements below distinguish
implemented controls from unverified behavior.

## Authentication

- **Observed controls:** Argon2 password hashes; short-lived HS256 access JWT
  with issuer/audience/algorithm verification; active database session lookup
  on protected requests; hashed random refresh tokens; transactional rotation;
  reuse revocation; HttpOnly web refresh cookie; mobile refresh token in
  Expo SecureStore; configured login/refresh/reset limiters.
- **Not yet verified:** end-to-end login and disabled-user paths, invalid and
  expired tokens, rotation/reuse/logout/concurrency, limiter behavior under
  proxy and multiple API instances, and assurance that no auth response/log
  contains a credential. Existing tests do not cover most of these cases.
- **Risk:** default rate-limit storage is process local. Error logging was
  restricted to allowlisted fields and query strings are removed from request
  URLs; one logger regression test passes.

## Authorization and organization isolation

- **Observed controls:** route middleware authenticates and role-checks most
  administrative routes; business services usually derive organization IDs
  from authenticated context; employee assignment, attendance, survey, and
  location paths commonly scope by employee ownership; query values do not
  generally supply the authoritative organization ID.
- **Not yet verified:** comprehensive cross-organization tests across every
  list/detail/mutation/export/analytics/location path and full supervisor
  scope. Sync duplicate owner checks have targeted regression coverage. Mobile
  offline stores and attendance queues are account-scoped; native SQLite
  device migration still needs integration testing.
- **Frontend:** web routes check authenticated session; server enforcement is
  authoritative. UI role hiding is not a substitute for API authorization.

## API and input validation

- **Observed controls:** Zod validation is used in most route modules; object
  schemas frequently reject unknown keys; Express JSON limit is 1 MiB;
  Helmet and explicit credentialed CORS are enabled; production 5xx responses
  use generic messages; request IDs are returned.
- **Risks:** some identifiers are not schema-validated at route level. GIS
  imports/spatial queries now apply bounded structural validation before
  writes/querying, with unit regression coverage; PostGIS integration remains
  outstanding. Error logs no longer serialize raw request errors.
- **CORS/transport:** origins are explicitly listed and credentialed; secure
  cookies are required by production env validation. HTTPS termination and
  proxy configuration are deployment responsibilities and were not tested.

## Database security

- Prisma is used for ordinary CRUD and tagged-template raw SQL was observed
  for GIS and analytics statements; no dynamic SQL identifier interpolation
  was found in the reviewed paths.
- Schema contains foreign keys, uniqueness constraints, organization indexes,
  and transaction use for critical workflows. Cross-organization consistency
  is mostly enforced in application queries rather than composite tenant
  foreign keys; multi-tenant DB integrity tests are needed.
- Database least privilege, TLS, secret rotation, backup access, encryption,
  and restore integrity could not be verified from application code alone.

## File and attachment security

- **Observed controls:** private S3-compatible bucket usage is assumed;
  object keys are server-generated UUID paths; presigned URLs expire after
  five minutes; allowlisted declared MIME types and 10 MiB declared size;
  ownership is checked on parent survey; access is audited.
- **Risks/unverified:** bytes are not magic-byte inspected or malware scanned;
  completion verifies stored size/type against declared metadata, not actual
  content. Storage bucket privacy, encryption, lifecycle, and signed URL policy
  are external configuration. Attachment duplicate sync needs ownership
  scoping.

## GIS and location security

- **Observed controls:** submitted point coordinates have WGS84 bounds; GIS
  SQL uses longitude then latitude with tagged parameters; location submission
  requires an active tracking session and uses an employee/event uniqueness
  key; manager history is organization-scoped; location policy documents
  purpose and privacy expectations.
- **Risks/unverified:** import geometry validation is not structural enough
  before reaching PostGIS; import rollback/large and malformed payloads lack
  tests. Supervisor-specific location scope and sensitive access audit need
  dedicated tests. Future capture-time rejection and treatment of implausible
  timestamps need verification. Retention and tracking activation policies
  remain undecided for production.

## Offline synchronization and review

- Survey sync has owner/org checks on duplicate and existing survey paths,
  payload-hash idempotency, version checks, and assignment/village
  authorization. Mocked cross-owner regressions pass; database-backed tenant
  workflow verification remains outstanding.
- Attachment sync rejects client attachment IDs bound to another survey or
  uploader. Actual object transfer is via the separate signed upload API.
- Survey review operations are role restricted and use organization scopes in
  services; transition rules, duplicate reviews, audit generation, and
  comments need integration coverage.

## Audit logging and sensitive data

- Auth and operational modules create database audit records for selected
  events, including report export, attachment access, assignment changes,
  attendance events/corrections, and survey review. There is no demonstrated
  comprehensive audit coverage for every sensitive read/configuration change.
- Request logs omit query strings; error logs project only allowlisted fields.
  A regression test checks that a synthetic secret is absent.
- Audit-log retention, tamper resistance, and access policy are not defined
  by this repository review.

## Backup security and recovery

- An encryption/access-control and restore runbook exists, with an isolated
  PostGIS dump/restore comparison added to CI. No successful CI execution is
  available yet, so backup recovery is not verified.
- Before production, document encrypted backups, access restrictions, recovery
  objectives, PostGIS extension/geometry checks, retention, and restore drills
  in an isolated environment.

## Audit disposition

Targeted code fixes and regression tests address the sync, GIS, logging, and
mobile offline account-isolation findings. The evidence does not establish
production readiness: database-backed tenant tests, native device migration,
upload content inspection, multi-instance rate limiting, and successful CI
restore evidence remain outstanding.
