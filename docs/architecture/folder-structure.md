# GeoField Pro — Repository Folder Structure

## 1. Repository Layout

geofield-pro/
|
+-- apps/
|   |
|   +-- admin-web/
|   |   +-- public/
|   |   +-- src/
|   |       +-- app/
|   |       +-- components/
|   |       +-- features/
|   |       +-- hooks/
|   |       +-- layouts/
|   |       +-- lib/
|   |       +-- pages/
|   |       +-- services/
|   |       +-- styles/
|   |       +-- main.jsx
|   |       +-- App.jsx
|   |   +-- package.json
|   |   +-- vite.config.js
|   |
|   +-- employee-mobile/
|   |   +-- src/
|   |       +-- app/
|   |       +-- components/
|   |       +-- features/
|   |       +-- hooks/
|   |       +-- navigation/
|   |       +-- services/
|   |       +-- storage/
|   |       +-- sync/
|   |       +-- utils/
|   |   +-- app.json
|   |   +-- package.json
|   |
|   +-- api/
|       +-- prisma/
|       |   +-- schema.prisma
|       |   +-- migrations/
|       +-- src/
|       |   +-- config/
|       |   +-- middleware/
|       |   +-- modules/
|       |   |   +-- auth/
|       |   |   +-- organizations/
|       |   |   +-- users/
|       |   |   +-- teams/
|       |   |   +-- assignments/
|       |   |   +-- attendance/
|       |   |   +-- gis/
|       |   |   +-- locations/
|       |   |   +-- surveys/
|       |   |   +-- sync/
|       |   |   +-- notifications/
|       |   |   +-- audit/
|       |   |   +-- reports/
|       |   +-- routes/
|       |   +-- services/
|       |   +-- utils/
|       |   +-- app.js
|       |   +-- server.js
|       +-- tests/
|       +-- package.json
|
+-- packages/
|   +-- shared-validation/
|   +-- shared-constants/
|   +-- shared-utils/
|   +-- api-contracts/
|
+-- docs/
|   +-- product/
|   +-- architecture/
|   +-- database/
|   +-- api/
|   +-- security/
|   +-- privacy/
|   +-- phases/
|
+-- docker-compose.yml
+-- package.json
+-- pnpm-workspace.yaml
+-- .gitignore
+-- .env.example
+-- README.md

## 2. Admin Web Responsibilities

apps/admin-web contains the browser-based administrative application.

It is responsible for:
- Administrative layouts.
- User and team management screens.
- Assignment management screens.
- Attendance dashboards.
- GIS map interfaces.
- Survey review screens.
- Reports and analytics.
- API client integration.

It must not independently implement authoritative backend authorization.

## 3. Employee Mobile Responsibilities

apps/employee-mobile contains the Expo-based mobile application.

It is responsible for:
- Employee authentication interfaces.
- Assignment lists and details.
- Attendance and break interfaces.
- Tracking status and permission handling.
- Survey forms.
- Attachment capture and upload.
- Offline storage.
- Synchronization queues.
- Notification interfaces.

It must not assume that the device clock or local state is authoritative.

## 4. API Responsibilities

apps/api contains the backend service.

It is responsible for:
- HTTP routes.
- Authentication and authorization.
- Business rules.
- Database access.
- Validation.
- Tenant isolation.
- GIS operations.
- Offline synchronization.
- Audit logging.
- Notifications and reporting.

## 5. Shared Packages

### shared-validation
Reusable Zod schemas for data structures that genuinely need to be shared.

### shared-constants
Shared enumerations and stable application constants.

### shared-utils
Small, environment-independent utility functions.

### api-contracts
Shared API request, response, and error contract definitions.

Shared packages must not become a dumping ground for application-specific logic.

## 6. Database Directory

apps/api/prisma contains the Prisma schema and migration history.

PostGIS-specific SQL, extensions, indexes, constraints, and triggers must be managed through reviewed migrations where necessary.

## 7. Testing Locations

- Backend unit and integration tests: apps/api/tests
- Web tests: apps/admin-web
- Mobile tests: apps/employee-mobile
- Shared package tests: within their respective packages

## 8. Architecture Rules

- Use JavaScript ES modules.
- Do not introduce TypeScript.
- Do not introduce Spring Boot.
- Keep business logic out of route handlers where practical.
- Keep authorization in the backend.
- Validate all untrusted inputs.
- Keep secrets out of Git.
- Avoid circular dependencies.
- Document significant architectural changes.