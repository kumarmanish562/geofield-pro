# Phase 12: Offline-First Synchronization

## Architecture

Employee mobile uses Expo SQLite on native platforms for durable survey drafts, queue items, retry metadata, and synchronization history. The browser export uses a platform-specific fallback so the application remains buildable; production field use is native mobile. Authentication tokens remain in SecureStore and are never written to the offline database.

The queue uses stable client survey and event IDs. A survey is persisted locally before any network request, transitions through `PENDING_SYNC`, `SYNCING`, `SYNCED`, or `FAILED`, and is not considered synchronized until the server confirms the operation. The network provider starts synchronization when connectivity returns, while the Offline Sync screen provides manual control and local history.

## Server synchronization

Migration `20261103090000_add_offline_sync` adds stable client survey/attachment identifiers, server survey versions, `sync_events`, and `sync_history`. `POST /api/v1/sync/surveys` validates employee assignment ownership, deduplicates client events, persists surveys transactionally, and returns the server version/timestamp. A stale version returns `CONFLICT` with both versions instead of overwriting server data.

Endpoints:

- `POST /api/v1/sync/surveys`
- `POST /api/v1/sync/attachments`
- `GET /api/v1/sync/status`
- `GET /api/v1/sync/history`
- `GET /api/v1/sync/conflicts`
- `POST /api/v1/sync/conflicts/:eventId/resolve`

`KEEP_SERVER` is an explicit conflict strategy. `RETRY_CLIENT` is rejected until the client refreshes the server version, preventing silent last-write-wins behavior.

## Retry and attachments

Queue failures retain the item and use exponential delays of 5, 10, 20, 40, and 60 seconds. Validation, authorization, and conflict errors are recorded as failed items for user review rather than retried indefinitely. Attachment IDs are stable and are passed to the existing S3 presign/complete workflow, which enforces ownership, MIME type, size, object verification, and duplicate protection.

## Commands

```powershell
pnpm db:up
pnpm db:deploy
pnpm db:generate
pnpm --filter @geofield/api test
pnpm --filter @geofield/employee-mobile build
pnpm dev:mobile
```

Docker/PostGIS must be running before applying migrations or exercising integration tests.
