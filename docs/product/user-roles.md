# GeoField Pro — User Roles and Permissions

Version: 1.0
Phase: 00

## 1. Purpose

This document defines the initial roles, permissions, and
authorization boundaries for GeoField Pro.

The backend must enforce these permissions.

Frontend visibility is not a security boundary.

## 2. SUPER_ADMIN

Purpose:
Platform-wide administration.

Responsibilities:

- Manage platform-level configuration.
- Create and manage organizations.
- Handle authorized platform-level administration.
- Review platform operational health.
- Manage platform security configuration.
- Perform explicitly authorized support operations.

Restrictions:

- Platform-wide administrative capability does not automatically
  justify unrestricted access to employee location histories.
- Sensitive tenant data access must follow approved policy.
- Cross-organization operations must be auditable.
- SUPER_ADMIN actions must not bypass basic data integrity rules.

## 3. ADMIN

Purpose:
Organization administration.

Responsibilities:

- Manage organization settings.
- Manage organization users.
- Invite employees.
- Manage teams.
- Manage organization assignments.
- Review authorized attendance reports.
- Access permitted surveys and analytics.
- Manage organization-level configuration.

Restrictions:

- ADMIN is limited to the assigned organization.
- ADMIN cannot change platform-wide configuration.
- ADMIN cannot access another organization's private data.
- Sensitive operations must be audited.

## 4. SUPERVISOR

Purpose:
Manage field teams and assignments.

Responsibilities:

- Manage authorized teams.
- Allocate assignments.
- View assigned employee work status.
- Review permitted attendance records.
- Monitor authorized operational location updates.
- Review surveys when separately authorized.
- Track assignment completion.

Restrictions:

- Access is limited to assigned teams and operational scope.
- SUPERVISOR cannot manage platform configuration.
- SUPERVISOR cannot access unrelated organizations.
- SUPERVISOR cannot approve their own survey submission unless
  an explicitly approved policy allows it.

## 5. GIS_ANALYST

Purpose:
Manage GIS data and village boundaries.

Responsibilities:

- Import geographic data.
- Validate village boundaries.
- Correct permitted geometry errors.
- Inspect spatial data quality.
- Maintain GIS metadata.
- Run authorized spatial queries.
- Review boundary change history.

Restrictions:

- GIS access does not automatically grant attendance access.
- GIS access does not automatically grant employee location-history
  access.
- GIS operations are restricted to the authorized geographic and
  organizational scope.
- Boundary modifications must be audited.

## 6. EMPLOYEE

Purpose:
Perform assigned fieldwork.

Responsibilities:

- View their own profile.
- View authorized assignments.
- Start and end attendance.
- Start and end breaks.
- Submit permitted location observations.
- Complete assigned surveys.
- Upload permitted attachments.
- Save records offline.
- Synchronize pending records.
- View their own submission history.
- Respond to correction requests.

Restrictions:

- Employees cannot access another employee's private records.
- Employees cannot allocate assignments.
- Employees cannot change their own role.
- Employees cannot review their own submissions unless explicitly
  permitted by an approved business rule.
- Employees cannot modify accepted records outside the authorized
  correction workflow.

## 7. Initial Permission Matrix

Legend:

FULL = Full capability within the stated scope.
SCOPED = Capability limited by organization or resource scope.
LIMITED = Explicitly granted operations only.
NO = No default permission.

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | GIS_ANALYST | EMPLOYEE |
|---|---|---|---|---|---|
| Platform settings | FULL | NO | NO | NO | NO |
| Organization management | Platform scope | SCOPED | NO | NO | NO |
| User management | Platform scope | Organization scope | LIMITED | NO | Own profile |
| Team management | Platform scope | Organization scope | Assigned teams | NO | NO |
| Assignment management | Platform scope | Organization scope | Assigned scope | NO | View assigned |
| Attendance management | Explicit grant | Organization scope | Assigned scope | NO | Own records |
| Break management | Explicit grant | Organization scope | Assigned scope | NO | Own records |
| Location history | Explicit grant | Approved scope | Assigned scope | NO by default | Own permitted records |
| Village boundaries | Explicit grant | View by default | Relevant view | GIS scope | Relevant view |
| Survey submission | Explicit grant | Approved scope | Approved scope | NO by default | Assigned surveys |
| Survey review | Explicit grant | If granted | If granted | If granted | NO by default |
| Analytics | Platform scope | Organization scope | Team scope | GIS scope | Own permitted data |
| Audit log access | Platform scope | Organization scope | LIMITED | GIS events if granted | NO |
| Security administration | Platform scope | Organization scope | NO | NO | NO |

The matrix defines default permissions. Each operation must have a
specific authorization rule in its implementation.

## 8. Authorization Model

Authorization must consider:

1. Authenticated user identity.
2. Active account status.
3. Current role.
4. Organization membership.
5. Team membership where applicable.
6. Assignment allocation where applicable.
7. Resource ownership.
8. Explicit permissions for sensitive operations.

## 9. Deny-by-Default Rule

If the backend cannot establish that an operation is permitted,
the operation must be rejected.

The frontend must never be trusted to enforce authorization.

## 10. Tenant Isolation

An ADMIN in Organization A must not access private records belonging
to Organization B.

A SUPERVISOR must not access teams outside their authorized scope.

An EMPLOYEE must not access another employee's attendance,
location observations, or surveys by guessing record identifiers.

A GIS_ANALYST must not automatically receive access to employee
location histories merely because both use geographic data.

## 11. Sensitive Operations

The following operations require explicit authorization and auditing:

- Changing a user's role.
- Suspending an account.
- Changing team membership.
- Allocating employees to assignments.
- Correcting attendance.
- Accessing sensitive location history.
- Exporting personal information.
- Changing village boundaries.
- Reviewing or overriding survey decisions.
- Accessing data across organizations.

## 12. Future Extension

Additional fine-grained permissions may be introduced later.

Examples:

- attendance.read.team
- attendance.correct.organization
- assignments.allocate.team
- surveys.review.assignment
- villages.update.organization
- locations.read.assignment
- reports.export.organization

Permission names are illustrative until the API and authorization
implementation is approved.