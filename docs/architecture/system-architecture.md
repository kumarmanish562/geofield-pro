# GeoField Pro — System Architecture

Version: 1.0
Phase: 00

## 1. Purpose

This document defines the proposed high-level architecture of
GeoField Pro.

The architecture separates client applications, backend business
logic, data persistence, geospatial operations, and real-time
communication.

## 2. Mandatory Technology Stack

Admin web:
- React.
- Vite.
- JavaScript.

Employee mobile:
- React Native.
- Expo.
- JavaScript.

Backend:
- Node.js.
- Express.js.
- JavaScript ES modules.

Database:
- PostgreSQL.
- PostGIS.
- Prisma.
- Reviewed SQL migrations where required.

Validation:
- Zod.

Real-time communication:
- Socket.IO.

API documentation:
- OpenAPI.
- Swagger UI.

Testing:
- Vitest.
- Supertest.
- Suitable React Native and Expo testing tools.

Development infrastructure:
- pnpm workspaces.
- Docker.
- Docker Compose.

TypeScript and Spring Boot are prohibited by the project requirements.

## 3. High-Level Architecture

```text
+----------------------+      +------------------------+
| Admin Web            |      | Employee Mobile        |
| React + Vite         |      | React Native + Expo    |
| JavaScript           |      | JavaScript             |
+----------+-----------+      +------------+-----------+
           |                               |
           +---------------+---------------+
                           |
                           v
                +----------------------+
                | HTTPS API            |
                | REST + Socket.IO     |
                +----------+-----------+
                           |
                           v
                +----------------------+
                | Express Backend      |
                | JavaScript ES Modules|
                +----------+-----------+
                           |
            +--------------+---------------+
            |              |               |
            v              v               v
     Authentication   Business Rules   Authorization
            |              |               |
            +--------------+---------------+
                           |
                           v
                +----------------------+
                | Data Access          |
                | Prisma + SQL         |
                +----------+-----------+
                           |
                           v
                +----------------------+
                | PostgreSQL + PostGIS |
                +----------------------+


                # GeoField Pro — System Architecture

## 1. Architecture Overview

GeoField Pro uses a modular, API-centered architecture.

The system contains:

1. Admin Web Application.
2. Employee Mobile Application.
3. Backend API.
4. PostgreSQL database with PostGIS.
5. Private attachment storage.
6. Real-time communication.
7. Offline synchronization.
8. Supporting infrastructure and automated tests.

## 2. Technology Decisions

### Admin Web
- React
- Vite
- JavaScript

### Employee Mobile
- React Native
- Expo
- JavaScript

### Backend
- Node.js
- Express.js
- JavaScript ES modules
- Zod
- Socket.IO
- OpenAPI and Swagger

### Database
- PostgreSQL
- PostGIS
- Prisma
- Reviewed SQL migrations

### Repository and Tooling
- pnpm workspaces
- Docker
- Docker Compose
- Vitest
- Supertest

TypeScript and Spring Boot are explicitly excluded.

## 3. High-Level Request Flow

Admin Web Application
    |
    | HTTPS / JSON
    v
Backend API
    |
    +---- Authentication and Authorization
    |
    +---- Organization and Workforce Modules
    |
    +---- Assignment and Attendance Modules
    |
    +---- GIS and Location Modules
    |
    +---- Survey and Synchronization Modules
    |
    +---- Notification and Reporting Modules
    |
    v
PostgreSQL + PostGIS

Employee Mobile Application
    |
    | HTTPS / JSON
    v
Backend API
    |
    +---- Authorized REST endpoints
    |
    +---- Offline synchronization
    |
    +---- Private attachment handling
    |
    +---- Socket.IO events
    |
    v
PostgreSQL + PostGIS

## 4. Monorepo Structure

The repository contains:

- apps/admin-web
- apps/employee-mobile
- apps/api
- packages/shared-validation
- packages/shared-constants
- packages/shared-utils
- packages/api-contracts
- docs

Each application has a separate responsibility.

## 5. Backend Module Boundaries

### Authentication
Responsible for login, logout, refresh-token rotation, password recovery, and invitation acceptance.

### Organizations
Responsible for organization settings and tenant boundaries.

### Users and Employees
Responsible for employee profiles, account state, and user administration.

### Teams
Responsible for team membership and supervisor relationships.

### Assignments
Responsible for assignment creation, allocation, status, and completion.

### Attendance
Responsible for check-in, check-out, breaks, and attendance history.

### GIS
Responsible for village boundaries, geometry validation, and spatial queries.

### Location
Responsible for authorized location observations and tracking policies.

### Surveys
Responsible for survey definitions, responses, attachments, reviews, and corrections.

### Synchronization
Responsible for idempotency, offline operations, retries, and conflict handling.

### Notifications
Responsible for notification records and delivery coordination.

### Audit
Responsible for recording significant system events.

### Reporting
Responsible for authorized summaries and analytics.

## 6. Database Architecture

PostgreSQL is the primary relational database.

PostGIS supports spatial types and geographic operations.

Prisma provides application-level database access. SQL migrations may be required for PostGIS-specific features and database constraints that are not adequately represented by the Prisma schema.

All production schema changes must be reviewed and version-controlled.

## 7. Authentication and Authorization

- Use short-lived access tokens.
- Use rotating refresh tokens.
- Store refresh-token records securely.
- Define revocation and reuse-detection behavior.
- Validate authorization on every protected request.
- Enforce tenant isolation.
- Apply record-level access checks where required.

Token storage must follow a documented policy appropriate to each application.

## 8. Real-Time Communication

Socket.IO may deliver authorized operational updates.

Every connection and event must validate:
- Authentication.
- Account status.
- Organization membership.
- Required role and resource permissions.

Sensitive information must not be broadcast to unauthorized rooms.

## 9. Offline-First Architecture

The mobile application may store supported operations locally.

Each queued operation must have a stable identifier or idempotency key.

Synchronization must:
- Authenticate the user.
- Validate each operation.
- Prevent duplicate processing.
- Detect conflicts.
- Return explicit operation outcomes.
- Protect locally stored data.

## 10. Attachment Storage

Survey attachments must use private storage.

The system must:
- Validate file size and content type.
- Generate safe object identifiers.
- Avoid public access by default.
- Authorize downloads.
- Define retention and deletion behavior.
- Avoid exposing internal storage paths.

## 11. Security Boundaries

- Web and mobile clients are untrusted.
- Backend authorization is authoritative.
- Database access uses controlled credentials.
- Organization data is isolated.
- Sensitive actions are audited.
- Secrets are stored outside source control.
- Production traffic uses HTTPS.

## 12. Testing Strategy

### Unit Tests
Test business rules and validation.

### API Tests
Use Supertest to verify routes, status codes, authentication, and authorization.

### Database Tests
Verify migrations, constraints, tenant isolation, and spatial functionality.

### Mobile Tests
Test essential screens, offline states, synchronization, and user interactions.

### Integration Tests
Test critical workflows across application modules.

## 13. Deployment Architecture

Development may use Docker Compose for local infrastructure.

Production deployment must provide:
- Secure configuration.
- HTTPS.
- Database backups.
- Health checks.
- Logs and monitoring.
- Controlled migrations.
- Recovery procedures.

## 14. Architecture Principles

- Keep modules cohesive.
- Separate web and mobile experiences.
- Treat the backend as the authority for business rules.
- Prefer explicit contracts.
- Validate all external input.
- Protect tenant boundaries.
- Make offline operations idempotent.
- Design location tracking for transparency and privacy.
- Avoid unnecessary infrastructure complexity.