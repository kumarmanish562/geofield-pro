# GeoField Pro — Product Requirements Document

Version: 1.0
Phase: 00 — Product and Architecture Foundation
Status: Proposed baseline for review
Project: GeoField Pro

---

## 1. Product Overview

GeoField Pro is a GIS-powered field workforce management platform
for organizations that coordinate employees performing geographic
fieldwork.

The platform provides tools for employee management, team management,
assignment allocation, attendance, authorized GPS observations,
village boundary management, field surveys, photo attachments,
offline data collection, survey review, notifications, analytics,
and auditing.

The platform consists of two separate client applications:

1. Admin Web Application.
2. Employee Mobile Application.

Both applications communicate with a centralized backend API.

The backend is the authoritative source for authentication,
authorization, business rules, persistence, tenant isolation,
and synchronization.

## 2. Product Objectives

The product must:

1. Help organizations organize field employees.
2. Allow supervisors to allocate assignments.
3. Record employee attendance and breaks.
4. Support transparent, authorized work-session location tracking.
5. Manage village boundaries using PostGIS.
6. Allow employees to collect structured field survey data.
7. Support photo and document attachments.
8. Allow fieldwork to continue when network connectivity is unavailable.
9. Synchronize offline records safely.
10. Provide survey review and correction workflows.
11. Deliver relevant operational notifications.
12. Provide permission-aware reporting.
13. Preserve an auditable history of important operations.
14. Protect employee and organizational data.
15. Prevent unauthorized access between organizations.

## 3. Product Scope

### 3.1 Included Capabilities

- Organization management.
- User management.
- Employee profiles.
- Team management.
- Employee invitations.
- Authentication and session management.
- Assignment creation and allocation.
- Attendance and break management.
- Authorized location observations.
- Village boundary management.
- Spatial queries.
- Survey creation and submission.
- Attachment management.
- Offline mobile storage.
- Synchronization and conflict handling.
- Survey review and correction.
- Notifications.
- Administrative dashboards.
- Analytics and reporting.
- Audit logging.
- Role-based authorization.
- Organization-level tenant isolation.

### 3.2 Excluded from Phase 00

Phase 00 is documentation-only.

Do not implement:

- API endpoints.
- Database migrations.
- Prisma models.
- Authentication.
- GPS tracking.
- Attendance logic.
- Assignment logic.
- Survey workflows.
- Mobile screens.
- Web screens.
- Production infrastructure.

These features belong to subsequent phases.

## 4. User Experiences

### 4.1 Admin Web Application

Technology:

- React.
- Vite.
- JavaScript.
- Shared validation and API contracts where appropriate.

The admin web application serves authorized platform administrators,
organization administrators, supervisors, and GIS analysts.

Expected modules:

1. Login and session management.
2. Organization administration.
3. User and employee management.
4. Invitation management.
5. Team management.
6. Assignment management.
7. Attendance and break reporting.
8. Authorized field-operation monitoring.
9. Village and GIS management.
10. Survey management.
11. Survey review.
12. Notifications.
13. Analytics and reporting.
14. Audit log access.

The interface must hide unavailable actions for usability, but the
backend must independently enforce every permission.

### 4.2 Employee Mobile Application

Technology:

- React Native.
- Expo.
- JavaScript.

The mobile application serves employees performing fieldwork.

Expected modules:

1. Login and logout.
2. Employee profile.
3. Assigned work.
4. Assignment details.
5. Attendance.
6. Break management.
7. Location permission explanation.
8. Authorized location collection.
9. Village map and boundaries.
10. Survey forms.
11. Photo attachments.
12. Local offline storage.
13. Synchronization.
14. Submission history.
15. Review corrections.
16. Notifications.

The mobile application must clearly distinguish:

- Saved locally.
- Waiting to synchronize.
- Synchronization in progress.
- Accepted by the server.
- Rejected by the server.
- Requires user correction.

## 5. User Roles

The initial roles are:

- SUPER_ADMIN.
- ADMIN.
- SUPERVISOR.
- GIS_ANALYST.
- EMPLOYEE.

Role permissions are documented in:

docs/product/user-roles.md

Roles must not replace resource-level authorization. A user's
organization, team, assignment, and ownership scope must also be
checked when applicable.

## 6. Functional Requirements

### FR-001: Organization Management

The platform shall support organization creation and management.

Each organization shall have a stable identifier.

Organization-owned records shall be isolated from other organizations.

### FR-002: User Management

Authorized administrators shall be able to manage users within
their permitted scope.

User status shall support the documented account lifecycle.

A disabled account shall not be able to establish a new authenticated
session.

### FR-003: Invitations

Authorized administrators shall be able to invite users.

Invitations shall have an expiration time and a single-use acceptance
workflow.

Invitation tokens shall not be stored as plaintext.

### FR-004: Teams

Authorized users shall be able to create and manage teams.

Team membership shall respect organization boundaries.

### FR-005: Assignments

Authorized supervisors shall be able to create assignments and
allocate employees.

Assignments shall have explicit statuses and lifecycle rules.

Employees shall only see assignments they are authorized to access.

### FR-006: Attendance

Employees shall be able to start and end attendance sessions.

The backend shall validate attendance state transitions.

Duplicate requests shall not create duplicate attendance sessions.

### FR-007: Breaks

Employees shall be able to start and end breaks associated with
attendance records.

Break transitions shall be validated by the backend.

### FR-008: Location Observations

The mobile application shall collect location observations only
for disclosed and authorized operational purposes.

Location observations shall include capture timestamps and accuracy
metadata when available.

Missing observations shall not automatically be treated as evidence
of misconduct.

### FR-009: Village Boundaries

Authorized GIS analysts shall be able to manage village boundaries.

The platform shall use PostGIS for spatial data and spatial queries.

Invalid geometry shall be rejected or handled through a documented
correction process.

### FR-010: Surveys

Employees shall be able to create and submit assigned surveys.

The server shall validate submitted data before accepting it.

Survey submission shall support idempotent retries.

### FR-011: Attachments

Surveys may contain permitted photo or document attachments.

Attachments shall have validated metadata and controlled access.

### FR-012: Offline Collection

The mobile application shall preserve permitted survey data locally
when the network is unavailable.

Synchronization shall support retries and duplicate prevention.

### FR-013: Survey Reviews

Authorized reviewers shall be able to approve submissions, reject
them, or request corrections.

Review history shall be preserved.

### FR-014: Notifications

The platform shall deliver relevant operational notifications.

Users shall only receive notifications they are authorized to access.

### FR-015: Analytics

The platform shall provide role-appropriate attendance, assignment,
survey, and GIS reports.

All reports shall respect tenant isolation.

### FR-016: Audit Logging

Important security and business operations shall be auditable.

Audit records shall not contain passwords, authentication tokens,
or unnecessary sensitive payloads.

## 7. Non-Functional Requirements

### NFR-001: Security

All protected API operations shall require authentication and
appropriate authorization.

### NFR-002: Tenant Isolation

Organization-owned resources shall be isolated at the application
and database levels where appropriate.

### NFR-003: Reliability

Accepted business records shall be persisted durably.

Recoverable network failures shall not silently destroy offline data.

### NFR-004: Maintainability

The implementation shall use modular JavaScript ES modules and
consistent naming conventions.

### NFR-005: Performance

Large collections shall support pagination.

Frequently queried relationships shall be indexed appropriately.

Spatial queries shall use suitable spatial indexes.

Numeric performance targets must be approved before they become
release acceptance criteria.

### NFR-006: Observability

The backend shall support structured logs, request identifiers,
health checks, and operational diagnostics.

### NFR-007: Compatibility

The mobile application shall document supported operating-system
versions and required device capabilities before production release.

### NFR-008: Accessibility

The web application shall use accessible form labels, keyboard
navigation, readable contrast, and understandable error messages.

### NFR-009: Privacy

Personal and location information shall only be collected, accessed,
and retained according to documented purposes and approved policies.

## 8. Business Rules

1. The backend is the source of truth.
2. Clients cannot assign themselves privileged roles.
3. Employees cannot access other employees' private records by
   changing identifiers in API requests.
4. Organization-owned relationships must not cross tenant boundaries.
5. Assignment allocation must be authorized.
6. Attendance transitions must be validated.
7. Survey submission must be idempotent.
8. Survey review decisions must be auditable.
9. Location tracking must follow the approved tracking lifecycle.
10. Missing GPS data is not proof of misconduct.
11. Sensitive file access must be authorized.
12. Important audit history must not be silently overwritten.
13. Offline synchronization conflicts must have explicit outcomes.
14. All timestamps must have documented timezone semantics.

## 9. Assumptions Requiring Confirmation

The following decisions must be confirmed before the relevant
implementation phase:

- Whether employees can belong to multiple teams.
- Whether assignments can cover multiple villages.
- Whether attendance can be corrected after closure.
- Whether tracking continues during breaks.
- Whether background location tracking is required.
- Which attachment storage provider will be used.
- Required retention periods.
- Survey review and approval rules.
- Required reporting and export formats.
- Applicable legal and contractual obligations.

## 10. Phase 00 Acceptance Criteria

- Both user experiences are documented separately.
- Functional and non-functional requirements are recorded.
- All five roles are defined.
- Tenant isolation is specified.
- Initial database entities and relationships are documented.
- API conventions are defined.
- Security requirements are documented.
- Location tracking and retention decisions are recorded.
- The implementation roadmap defines later phases.
- No business features or migrations are implemented in Phase 00.