# GeoField Pro — Entity Relationship Design

## 1. Purpose

This document defines the conceptual database entities and their relationships.

It is not the final Prisma schema. Detailed field types, constraints, indexes, and migration SQL must be reviewed before implementation.

## 2. Organization and Identity

### Organization
Represents a customer organization.

Potential fields:
- id
- name
- status
- createdAt
- updatedAt

### User
Represents an authenticated platform user.

Potential fields:
- id
- email
- passwordHash or external identity reference
- role
- status
- createdAt
- updatedAt

### EmployeeProfile
Contains employee-specific information.

Potential fields:
- id
- userId
- organizationId
- employeeCode
- phone
- employmentStatus

### Team
Represents an organization team.

Potential fields:
- id
- organizationId
- name
- supervisorId
- createdAt
- updatedAt

### Invitation
Represents an invitation to join an organization.

Potential fields:
- id
- organizationId
- email
- role
- tokenHash
- expiresAt
- acceptedAt
- createdBy

### RefreshToken
Represents a refresh-token session or token family.

Potential fields:
- id
- userId
- tokenHash
- expiresAt
- revokedAt
- replacedByTokenId
- createdAt

### PasswordResetToken
Represents a password recovery request.

Potential fields:
- id
- userId
- tokenHash
- expiresAt
- usedAt
- createdAt

## 3. Workforce Operations

### Assignment
Represents a fieldwork assignment.

Potential fields:
- id
- organizationId
- title
- description
- status
- priority
- scheduledStart
- scheduledEnd
- createdBy
- createdAt
- updatedAt

### AssignmentEmployee
Associates employees with assignments.

Potential fields:
- id
- assignmentId
- employeeId
- assignedAt
- status

The design must define whether one employee can have multiple active assignments and how duplicate assignments are prevented.

### AttendanceRecord
Represents a work attendance session.

Potential fields:
- id
- organizationId
- employeeId
- checkInAt
- checkOutAt
- status
- createdAt
- updatedAt

### BreakRecord
Represents a break within an attendance session.

Potential fields:
- id
- attendanceRecordId
- startedAt
- endedAt
- status

## 4. GIS and Location

### Village
Represents a village or geographic operational area.

Potential fields:
- id
- organizationId
- name
- administrativeCode
- boundary geometry
- createdAt
- updatedAt

The exact geometry type and coordinate reference system must be decided before migration implementation.

### LocationObservation
Represents a recorded location observation.

Potential fields:
- id
- organizationId
- employeeId
- attendanceRecordId
- assignmentId
- observedAt
- position
- accuracyMeters
- source
- createdAt

Location observations require strict access controls and a defined retention policy.

## 5. Surveys

### Survey
Represents a survey definition or survey instance, depending on the final domain model.

Potential fields:
- id
- organizationId
- assignmentId
- employeeId
- status
- responses
- submittedAt
- createdAt
- updatedAt

Before implementation, decide whether survey templates and survey submissions require separate tables.

### SurveyAttachment
Represents a private file attached to a survey.

Potential fields:
- id
- surveyId
- uploadedBy
- storageKey
- contentType
- sizeBytes
- checksum
- createdAt

### SurveyReview
Represents a review action on a survey.

Potential fields:
- id
- surveyId
- reviewerId
- status
- comments
- reviewedAt

## 6. Notifications and Audit

### Notification
Represents a user notification.

Potential fields:
- id
- organizationId
- recipientUserId
- type
- payload
- readAt
- createdAt

### AuditLog
Represents a significant business or security event.

Potential fields:
- id
- organizationId
- actorUserId
- action
- entityType
- entityId
- metadata
- createdAt

Audit metadata must not contain secrets or unnecessary sensitive information.

## 7. Relationships

- Organization has many employee profiles.
- Organization has many teams.
- Organization has many assignments.
- Organization has many villages.
- Organization has many attendance records.
- Organization has many location observations.
- Organization has many surveys.
- User may have an employee profile.
- Team may have a supervisor.
- Employees may belong to teams according to the final membership model.
- Assignments may have multiple assigned employees.
- An employee may have multiple assignments.
- An employee may have multiple attendance records.
- An attendance record may contain multiple breaks.
- An attendance record may have multiple location observations.
- An assignment may have multiple location observations.
- An assignment may have multiple surveys.
- A survey may have multiple attachments.
- A survey may have multiple review records.
- A user may have multiple refresh-token records.
- A user may have multiple notifications.
- Significant operations may produce audit records.

## 8. Integrity Requirements

- Use primary keys.
- Use foreign keys for relational integrity.
- Use unique constraints where appropriate.
- Validate organization consistency across related records.
- Prevent invalid attendance state transitions.
- Prevent duplicate processing of idempotent operations.
- Use appropriate spatial indexes.
- Define deletion and retention rules for sensitive records.
- Use transactions for multi-record operations.

## 9. Decisions Required Before Migrations

- Single-role versus multi-role user model.
- Employee team membership model.
- Survey template versus survey submission model.
- Village boundary versioning.
- Geometry type and coordinate reference system.
- Location retention period.
- Attachment storage provider.
- Soft deletion versus permanent deletion.
- Audit log retention.
- Offline synchronization conflict rules.