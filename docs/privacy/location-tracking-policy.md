# GeoField Pro — Location Tracking and Privacy Policy

## 1. Purpose

This document defines how GeoField Pro should collect, use, access, store, and protect employee location information.

The final policy must be reviewed against applicable law, employment agreements, and organizational requirements before production deployment.

## 2. Principles

Location tracking must follow these principles:

- Transparency.
- Purpose limitation.
- Data minimization.
- Restricted access.
- Defined retention.
- Security.
- Accountability.
- Appropriate employee notice.

## 3. Permitted Purposes

Location information may be used for approved purposes such as:

- Coordinating assigned fieldwork.
- Supporting field attendance workflows.
- Associating observations with assignments.
- Understanding authorized field coverage.
- Supporting operational reporting.
- Investigating documented operational issues through an approved process.

A purpose must be documented before the associated data is collected.

## 4. Tracking Activation

The implementation must define exactly when tracking may begin.

Possible conditions include:
- The employee is authenticated.
- The employee has an active authorized work session.
- The required operating-system permission is granted.
- The applicable organizational policy permits tracking.

The application must not silently activate tracking outside the approved conditions.

## 5. Tracking Deactivation

The implementation must define when tracking stops.

Potential stop conditions include:
- Work session ends.
- Authorized tracking period expires.
- The employee logs out.
- Permission is revoked.
- The operating system prevents further tracking.
- An authorized operational policy requires tracking to stop.

The final behavior must be documented and tested.

## 6. Employee Transparency

The mobile application should explain:

- Why location is collected.
- When tracking is active.
- Which information is collected.
- Who may access it.
- How long it is retained.
- How tracking behaves during connectivity loss.
- How employees can report a problem.

The application should display a clear tracking state.

## 7. Breaks and Off-Duty Periods

Tracking behavior during breaks must be explicitly decided before implementation.

The system must distinguish work time, breaks, and off-duty periods according to the approved policy.

Tracking must not continue outside authorized periods merely because it is technically possible.

## 8. Location Accuracy

Where available, store relevant accuracy information.

The system should distinguish:
- Accurate observations.
- Low-accuracy observations.
- Unavailable GPS.
- Permission denial.
- Device or operating-system restrictions.
- Offline observations awaiting synchronization.

A location observation is not necessarily proof of the employee's exact physical position.

## 9. Missing Location Data

Missing location observations must not automatically be interpreted as misconduct.

Possible causes include:
- Poor satellite reception.
- Network unavailability.
- Battery restrictions.
- Operating-system limitations.
- Permission changes.
- Device failure.
- Delayed synchronization.

Any investigation must use an appropriate, documented review process.

## 10. Offline Location Data

If offline collection is permitted:
- Explain the behavior to employees.
- Store data securely on the device.
- Restrict local access.
- Define the synchronization process.
- Prevent duplicate uploads.
- Define expiration and deletion rules.
- Avoid collecting more data than necessary.

## 11. Access Control

Location access must be limited to authorized roles and operational purposes.

Access must be:
- Organization-scoped.
- Role-appropriate.
- Auditable where appropriate.
- Limited to the required time range and geographic scope.

## 12. Real-Time Location

Real-time location must not be exposed through unrestricted broadcasts.

The backend must authenticate users and authorize subscriptions before providing location updates.

## 13. Retention

Before production, the product owner must define:
- Location observation retention.
- Attendance record retention.
- Audit-log retention.
- Offline record expiration.
- Legal hold requirements, if applicable.
- Deletion and anonymization behavior.

Do not retain precise location history indefinitely by default.

## 14. Data Deletion and Correction

Define how to handle:
- Incorrect observations.
- Duplicate observations.
- Employee record deletion requests.
- Organization offboarding.
- Expired data.
- Legal retention requirements.

Deletion must not accidentally violate necessary integrity or legal obligations.

## 15. Security

- Use encrypted transport.
- Restrict database access.
- Protect device storage.
- Avoid logging precise coordinates unnecessarily.
- Restrict exports.
- Protect backups.
- Audit sensitive access.

## 16. Employee Concerns

Provide a documented way for employees to report:
- Unexpected tracking.
- Incorrect location records.
- Permission problems.
- Data access concerns.
- Potential privacy violations.

## 17. Decisions Required Before Production

- Exact tracking activation conditions.
- Exact tracking stop conditions.
- Tracking behavior during breaks.
- Sampling frequency and movement thresholds.
- Permitted location accuracy handling.
- Offline location retention.
- Location history retention.
- Roles allowed to view live locations.
- Roles allowed to view historical locations.
- Export permissions.
- Applicable legal and organizational review.

## 18. Acceptance Criteria

- Tracking purpose is documented.
- Tracking state is visible to employees.
- Start and stop behavior is explicit.
- Access is restricted.
- Retention is defined.
- Missing GPS is not treated as proof of misconduct.
- Privacy requirements are tested before release.