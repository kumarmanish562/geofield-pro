# GeoField Pro — Data Dictionary

## 1. General Conventions

- Use consistent primary-key conventions.
- Use UTC timestamps for stored event times.
- Use explicit status fields or documented state models.
- Use foreign keys for relational integrity.
- Add createdAt and updatedAt where appropriate.
- Avoid storing unnecessary personal information.
- Never store raw refresh tokens or password-reset tokens when token hashes are sufficient.

Final field types and nullability must be confirmed during database design.

## 2. Organization

Purpose:
Represents a customer organization.

Fields:
- id: primary identifier.
- name: organization display name.
- status: organization lifecycle status.
- createdAt: creation timestamp.
- updatedAt: last modification timestamp.

Constraints:
- Name requirements must be defined.
- Status values must be controlled.
- Organization identifiers must not be trusted from clients without authorization.

## 3. User

Purpose:
Represents an authenticated user.

Fields:
- id: primary identifier.
- email: normalized email address.
- passwordHash: password hash when password authentication is enabled.
- role: assigned role or role association.
- status: account status.
- createdAt: creation timestamp.
- updatedAt: last modification timestamp.

Constraints:
- Email uniqueness policy must be defined.
- Passwords must never be stored in plaintext.
- Privileged roles require strict authorization.
- Account status must be checked during authentication.

## 4. EmployeeProfile

Purpose:
Stores employee-specific details.

Fields:
- id: primary identifier.
- userId: linked user.
- organizationId: owning organization.
- employeeCode: organization-specific employee identifier.
- phone: optional phone number.
- employmentStatus: employment state.

Constraints:
- Define employee-code uniqueness within an organization.
- Validate user and organization consistency.
- Limit access to personal details.

## 5. Team

Purpose:
Represents an operational team.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- name: team name.
- supervisorId: optional supervisor reference.
- createdAt: creation timestamp.
- updatedAt: modification timestamp.

Constraints:
- Team names and uniqueness rules must be defined.
- Supervisor must be authorized for the organization.

## 6. Invitation

Purpose:
Controls organization onboarding.

Fields:
- id: primary identifier.
- organizationId: target organization.
- email: invited email.
- role: permitted role after acceptance.
- tokenHash: hash of invitation token.
- expiresAt: expiration timestamp.
- acceptedAt: acceptance timestamp.
- createdBy: inviting user.

Constraints:
- Tokens must expire.
- Tokens must not be stored or logged in plaintext.
- Acceptance must be atomic.
- Invited roles must be authorized.

## 7. RefreshToken

Purpose:
Tracks refresh-token sessions.

Fields:
- id: primary identifier.
- userId: token owner.
- tokenHash: stored token hash.
- expiresAt: expiration timestamp.
- revokedAt: optional revocation timestamp.
- replacedByTokenId: optional replacement reference.
- createdAt: creation timestamp.

Constraints:
- Token rotation must be atomic.
- Revoked tokens cannot be reused.
- Reuse detection behavior must be documented.
- Token hashes must not be exposed through APIs.

## 8. PasswordResetToken

Purpose:
Supports secure account recovery.

Fields:
- id: primary identifier.
- userId: token owner.
- tokenHash: token hash.
- expiresAt: expiration timestamp.
- usedAt: optional consumption timestamp.
- createdAt: creation timestamp.

Constraints:
- Tokens must expire.
- Tokens must be single-use.
- Responses must avoid disclosing whether an account exists.

## 9. Assignment

Purpose:
Represents fieldwork.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- title: assignment title.
- description: optional details.
- status: assignment state.
- priority: assignment priority.
- scheduledStart: optional planned start.
- scheduledEnd: optional planned end.
- createdBy: creator.
- createdAt: creation timestamp.
- updatedAt: modification timestamp.

Constraints:
- Validate scheduling rules.
- Define allowed status transitions.
- Verify all referenced records belong to the appropriate organization.

## 10. AssignmentEmployee

Purpose:
Associates an employee with an assignment.

Fields:
- id: primary identifier.
- assignmentId: assignment reference.
- employeeId: employee reference.
- assignedAt: assignment timestamp.
- status: employee assignment state.

Constraints:
- Prevent duplicate active assignment associations where required.
- Validate employee and assignment organization consistency.
- Define reassignment behavior.

## 11. AttendanceRecord

Purpose:
Records a work session.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- employeeId: employee reference.
- checkInAt: check-in timestamp.
- checkOutAt: optional check-out timestamp.
- status: attendance state.
- createdAt: creation timestamp.
- updatedAt: modification timestamp.

Constraints:
- Define whether overlapping sessions are permitted.
- Validate check-out after check-in.
- Prevent duplicate check-in processing.
- Define correction and approval rules.

## 12. BreakRecord

Purpose:
Records a break.

Fields:
- id: primary identifier.
- attendanceRecordId: attendance session.
- startedAt: break start timestamp.
- endedAt: optional break end timestamp.
- status: break state.

Constraints:
- Validate break transitions.
- Prevent invalid end times.
- Define whether multiple simultaneous breaks are permitted.

## 13. Village

Purpose:
Stores a village and its boundary.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- name: village name.
- administrativeCode: optional external code.
- boundary: PostGIS geometry.
- createdAt: creation timestamp.
- updatedAt: modification timestamp.

Constraints:
- Define the geometry type.
- Define the coordinate reference system.
- Validate geometry.
- Use appropriate spatial indexes.
- Define boundary versioning and import rules.

## 14. LocationObservation

Purpose:
Stores an authorized location observation.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- employeeId: employee reference.
- attendanceRecordId: optional attendance session.
- assignmentId: optional assignment reference.
- observedAt: observation timestamp.
- position: spatial point.
- accuracyMeters: reported horizontal accuracy.
- source: observation source.
- createdAt: server-record creation timestamp.

Constraints:
- Validate coordinate ranges.
- Validate spatial reference systems.
- Define acceptable accuracy handling.
- Restrict access.
- Define retention and deletion rules.
- Do not infer misconduct from missing observations.

## 15. Survey

Purpose:
Stores a survey definition or submission, subject to the final domain decision.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- assignmentId: optional assignment reference.
- employeeId: submitting employee where applicable.
- status: survey lifecycle status.
- responses: validated response data.
- submittedAt: optional submission timestamp.
- createdAt: creation timestamp.
- updatedAt: modification timestamp.

Constraints:
- Define template and submission separation.
- Validate responses against the applicable schema.
- Define draft, submission, review, and correction states.
- Prevent duplicate submission processing.

## 16. SurveyAttachment

Purpose:
References a private survey attachment.

Fields:
- id: primary identifier.
- surveyId: survey reference.
- uploadedBy: uploading user.
- storageKey: private storage identifier.
- contentType: validated media type.
- sizeBytes: file size.
- checksum: optional integrity checksum.
- createdAt: creation timestamp.

Constraints:
- Validate file size and type.
- Prevent public access by default.
- Authorize upload and download.
- Define retention and deletion behavior.

## 17. SurveyReview

Purpose:
Records a review decision.

Fields:
- id: primary identifier.
- surveyId: survey reference.
- reviewerId: reviewer.
- status: review decision.
- comments: optional review notes.
- reviewedAt: review timestamp.

Constraints:
- Only authorized reviewers may create review decisions.
- Review history must remain auditable.
- Correction requests must be distinguishable from approvals.

## 18. Notification

Purpose:
Represents a notification for a user.

Fields:
- id: primary identifier.
- organizationId: owning organization.
- recipientUserId: recipient.
- type: notification category.
- payload: validated notification data.
- readAt: optional read timestamp.
- createdAt: creation timestamp.

Constraints:
- Validate recipients.
- Enforce tenant isolation.
- Avoid unnecessarily sensitive notification content.

## 19. AuditLog

Purpose:
Records significant security and business events.

Fields:
- id: primary identifier.
- organizationId: optional organization reference for platform-level events.
- actorUserId: optional actor reference.
- action: action identifier.
- entityType: affected entity category.
- entityId: affected record identifier.
- metadata: limited structured context.
- createdAt: event timestamp.

Constraints:
- Restrict modification and deletion.
- Never include passwords or raw tokens.
- Minimize personal information.
- Define retention and authorized access.

## 20. Migration Readiness

Before creating production migrations:

- Confirm every field's type and nullability.
- Confirm all foreign keys.
- Confirm uniqueness requirements.
- Confirm indexes.
- Confirm spatial reference systems.
- Confirm tenant-consistency constraints.
- Confirm deletion behavior.
- Confirm retention requirements.
- Test the complete migration chain on a clean database.