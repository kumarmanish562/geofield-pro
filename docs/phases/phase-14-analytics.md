# Phase 14 — Dashboard and Analytics

All endpoints are authenticated and restricted to `ADMIN`, `SUPERVISOR`, and
`GIS_ANALYST`. Every query is constrained to the authenticated organization.
Supervisor views further restrict assignments and their related survey and
attendance records to assignments they supervise (and employees they
supervise). An optional `teamId` applies a membership filter. Date filters are
inclusive. Paginated drill-down endpoints accept `page` (default 1) and
`pageSize` (default 25, maximum 100).

## Endpoints

- `GET /api/v1/analytics/overview`: organization KPI counts.
- `GET /api/v1/analytics/attendance`: attendance status trend and paginated
  records; also reports completed work-session duration.
- `GET /api/v1/analytics/assignments`: paginated assignments and target
  progress.
- `GET /api/v1/analytics/surveys`: current survey status totals, village
  submission counts (top 100 villages), approval rate, and paginated survey
  drill-down.
- `GET /api/v1/analytics/village-coverage`: paginated active villages with
  matching persisted survey counts.
- `GET /api/v1/analytics/locations`: location accuracy quality, delayed upload
  counts, and paginated employees with stale latest observations.

## Definitions and incomplete data

- Total employees counts active `EMPLOYEE` accounts. Active attendance counts
  `WORKING` records with a recorded check-in, not employees who checked in at
  any point today.
- Active assignments are `PUBLISHED` or `PAUSED`. Completion is persisted
  surveys divided by the sum of numeric assignment target values. A missing or
  zero target produces `null` completion percentage; measured survey totals
  remain visible and are never presented as estimated completion.
- Completed surveys are currently `APPROVED`; awaiting review is currently
  `SUBMITTED` or `UNDER_REVIEW`. The approval rate uses approved divided by
  approved plus rejected and excludes pending and correction-required surveys.
- Attendance trends count records by attendance date and current status, not
  unique employees. Average session duration includes only completed records
  with both check-in and check-out timestamps and subtracts recorded break
  seconds. Open sessions have no measured duration.
- Village coverage means a village has persisted matching survey activity.
  There is no population denominator, so it does not imply resident coverage.
  Active villages with no matching surveys have `hasActivity: false`.
- Missing GPS accuracy counts null accuracy values; poor accuracy is a
  reporting threshold above 100 meters. Delayed uploads have a capture to
  receipt gap over five minutes. Stale employees have a latest observation
  older than five minutes at query time. Delayed upload is evidence of sync
  delay; stale status does not confirm a device is offline because there is no
  authoritative offline-device heartbeat.

The Analytics page requests at most 20 drill-down items per page and exports
only the visible page. Trend and grouped counts are calculated in the database.
