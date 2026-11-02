# Phase 09 Handoff — GPS Tracking and Real-Time Monitoring

## Status

Implemented on `phase-09-gps-tracking`. Location tracking is organization-scoped and requires an administrator or supervisor-created active tracking session.

## Delivered

- PostGIS `geography(Point, 4326)` persistence using longitude-first `ST_MakePoint(longitude, latitude)`.
- Employee location submission, current-session, and history endpoints.
- Organization-scoped administrator/supervisor latest, history, and tracking-session endpoints.
- Event-id idempotency per employee and persistence-before-broadcast behavior.
- Socket.IO authentication with active-session validation and organization rooms.
- Freshness states: `ACTIVE` for observations received within five minutes and `STALE` afterwards.
- Admin live map with Leaflet, freshness, accuracy, search, and connection status.
- Mobile foreground permission and authorized-session location submission.
- API, web, and mobile validation coverage for authentication and coordinate bounds.

## API surface

- `POST /api/v1/locations`
- `GET /api/v1/locations/me`
- `GET /api/v1/locations/session/current`
- `GET /api/v1/admin/locations/latest`
- `GET /api/v1/admin/locations/history`
- `GET /api/v1/admin/locations/sessions`
- `POST /api/v1/admin/locations/sessions`
- `POST /api/v1/admin/locations/sessions/:sessionId/end`

Socket clients authenticate with the access token in the Socket.IO `auth.token` field. Organization administrators and supervisors receive `location:observation.created.v1`; employees do not join the organization room.

## Database

- `20261102023632_add_location_tracking`
- `20261102024000_add_location_geography`

The second migration enables PostGIS, adds the geography column, backfills existing observations, and creates a GiST index. Location timestamps are stored as UTC instants. The current mobile implementation is foreground-only; background collection requires separate platform review, permissions, and operational policy.

## Verification

- Prisma client generation passed.
- Prisma migration deployment passed against the configured PostgreSQL/PostGIS database.
- API tests passed.
- Admin web tests and production build passed.
- Employee mobile tests and web export passed.
- API syntax/build, ESLint, and Prettier checks passed.

## Next phase

Add survey collection and review workflows. Before enabling background tracking, add a durable retry queue with server confirmation semantics, platform-specific background permission configuration, and an operational retention/deletion job for location observations.
