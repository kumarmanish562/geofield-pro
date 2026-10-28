# GeoField Pro — Architecture Decision Records

## ADR-001: JavaScript-Only Stack

Status: Accepted

Decision:
Use JavaScript throughout the project.

Reason:
The project explicitly selects JavaScript for the web, mobile, and backend applications.

Consequences:
- Use JavaScript ES modules.
- Configure linting and tests for JavaScript.
- Do not introduce TypeScript.
- Do not introduce Spring Boot.

## ADR-002: pnpm Monorepo

Status: Accepted

Decision:
Use pnpm workspaces to manage the applications and shared packages.

Reason:
The project contains two clients, one API, and shared contracts.

Consequences:
- Define workspace packages explicitly.
- Keep application dependencies isolated where appropriate.
- Use workspace commands for testing and builds.

## ADR-003: Separate Web and Mobile Applications

Status: Accepted

Decision:
Build the administrative web application with React and Vite.
Build the employee mobile application with React Native and Expo.

Reason:
Administrators and field employees have different workflows and interface requirements.

Consequences:
- Share contracts and validation only where appropriate.
- Do not force both applications into a single interface.
- Keep mobile offline workflows separate from web administration workflows.

## ADR-004: Express API

Status: Accepted

Decision:
Use Node.js and Express.js for the backend.

Reason:
The backend must expose HTTP APIs, support validation, integrate with PostgreSQL, and provide real-time communication.

Consequences:
- Use JavaScript ES modules.
- Keep routing, validation, business logic, and database access organized.
- Document endpoints with OpenAPI.

## ADR-005: PostgreSQL and PostGIS

Status: Accepted

Decision:
Use PostgreSQL for relational data and PostGIS for spatial data.

Reason:
The platform requires reliable relational constraints, geographic boundaries, and spatial queries.

Consequences:
- Enable required PostgreSQL extensions.
- Use spatial indexes.
- Validate geometry and coordinate reference systems.
- Test GIS migrations against a compatible database.

## ADR-006: Prisma Plus Reviewed SQL Migrations

Status: Accepted

Decision:
Use Prisma for supported database access and schema management, with reviewed SQL migrations for PostGIS-specific capabilities.

Reason:
Some spatial extensions, indexes, and database features may require SQL beyond Prisma's normal schema representation.

Consequences:
- Version-control all migrations.
- Review generated migration SQL.
- Avoid destructive changes without an approved migration plan.
- Test migrations on a clean database.

## ADR-007: Tenant Isolation

Status: Accepted

Decision:
Organization boundaries must be enforced in backend access rules and database design.

Reason:
The platform may host multiple organizations with sensitive employee and operational data.

Consequences:
- Define organization ownership for tenant-scoped entities.
- Validate relationships between organizations.
- Test cross-tenant access attempts.
- Do not trust organization IDs supplied by clients.

Implementation details such as row-level security may be evaluated during database design.

## ADR-008: Access Tokens and Rotating Refresh Tokens

Status: Accepted

Decision:
Use JWT access tokens and rotating refresh tokens.

Reason:
The platform requires authenticated API access and session management.

Consequences:
- Keep access tokens short-lived.
- Define secure refresh-token storage for each client.
- Detect refresh-token reuse where appropriate.
- Support revocation.
- Never log token values.

## ADR-009: Zod Validation

Status: Accepted

Decision:
Use Zod for runtime validation of external input and environment configuration.

Reason:
JavaScript does not provide compile-time enforcement of runtime request data.

Consequences:
- Validate request parameters, query strings, and bodies.
- Validate environment variables at startup.
- Return consistent validation errors.
- Do not trust client-side validation alone.

## ADR-010: Socket.IO for Real-Time Updates

Status: Accepted

Decision:
Use Socket.IO for authorized real-time operational updates.

Reason:
Some workflows benefit from timely assignment, attendance, and status updates.

Consequences:
- Authenticate connections.
- Authorize rooms and events.
- Enforce tenant boundaries.
- Avoid unnecessary broadcasting of location data.

## ADR-011: Offline-First Mobile Workflows

Status: Accepted

Decision:
Support offline storage and later synchronization for designated mobile workflows.

Reason:
Field employees may work in areas with unreliable connectivity.

Consequences:
- Define an explicit synchronization contract.
- Use idempotency keys.
- Detect conflicting changes.
- Protect local data.
- Show pending and failed operations to users.

## ADR-012: Transparent GPS Tracking

Status: Accepted

Decision:
Collect location data only for documented and authorized purposes.

Reason:
Location information is sensitive employee data.

Consequences:
- Explain tracking purposes.
- Display tracking status.
- Define tracking start and stop rules.
- Limit access and retention.
- Do not treat missing GPS data as proof of misconduct.

## ADR-013: Private Attachment Storage

Status: Accepted

Decision:
Store survey attachments privately.

Reason:
Photographs may contain sensitive personal, property, or location information.

Consequences:
- Validate uploaded files.
- Authorize downloads.
- Use non-guessable object identifiers.
- Define retention and deletion behavior.

The final storage provider must be selected before implementing production attachment handling.

## ADR-014: Auditability

Status: Accepted

Decision:
Audit significant security and business operations.

Reason:
Administrative changes and field records require accountability.

Consequences:
- Record actor, action, time, and relevant record identifiers.
- Protect audit logs from unauthorized modification.
- Avoid recording secrets.
- Define retention and access policies.

## ADR-015: Database Integrity

Status: Accepted

Decision:
Use database constraints and transactions in addition to application-level validation.

Reason:
Application validation alone cannot prevent every invalid or concurrent database operation.

Consequences:
- Use foreign keys and unique constraints.
- Apply appropriate checks.
- Use transactions for multi-step operations.
- Test concurrency-sensitive workflows.

## ADR-016: Phase-Based Delivery

Status: Accepted

Decision:
Implement the platform through explicitly scoped phases.

Reason:
The platform has multiple applications and sensitive workflows that require incremental validation.

Consequences:
- Complete acceptance criteria for each phase.
- Maintain a handoff document between phases.
- Avoid implementing later-phase features prematurely.
- Report actual test results.