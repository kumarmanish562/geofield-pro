# Phase 11: Field Survey Collection

## Delivered

The API now supports organization-scoped field survey drafts, server-side validation, assignment/village authorization, draft editing and deletion, idempotent submission, and administrator review. Survey coordinates are stored as WGS84 latitude/longitude decimal values; longitude is not silently swapped with latitude.

Employee mobile includes a survey list and GPS-backed draft form. The admin web application includes a survey list and approve/reject review actions.

## API

- `GET /api/v1/surveys` - employee-owned survey list.
- `POST /api/v1/surveys` - create a draft.
- `GET /api/v1/surveys/:id` - get an authorized survey.
- `PATCH /api/v1/surveys/:id` - update a draft or rejected survey.
- `DELETE /api/v1/surveys/:id` - delete a draft.
- `POST /api/v1/surveys/:id/submit` - submit with a required `Idempotency-Key` header.
- `GET /api/v1/admin/surveys` - organization survey list for authorized staff.
- `GET /api/v1/admin/surveys/review-queue` - submitted review queue.
- `PATCH /api/v1/admin/surveys/:id/review` - approve or reject with a rejection reason.

The server is authoritative for status. A submission is only `SUBMITTED` after the transaction commits successfully. Retrying the same idempotency key returns the original result.

## Database

Migration `20261103080000_add_field_surveys` adds `surveys`, `survey_attachments`, and `survey_reviews`, with lifecycle enums, ownership foreign keys, indexes, and uniqueness constraints for survey numbers, object keys, and submission keys.

## Attachments

Attachment metadata validation is present at the API boundary for JPEG, PNG, and WebP files up to 10 MiB. The API generates five-minute S3-compatible presigned upload and preview URLs, verifies uploaded object size and content type with `HeadObject`, and stores only metadata in PostgreSQL. If storage credentials are absent, requests fail explicitly with `STORAGE_NOT_CONFIGURED`; clients must not treat a failed presign as an uploaded attachment.

## Configuration and commands

Existing API authentication and database configuration are reused. Start PostgreSQL/PostGIS before applying the migration:

```powershell
pnpm db:up
pnpm db:deploy
pnpm db:generate
pnpm dev
pnpm dev:web
pnpm dev:mobile
```

Validation commands:

```powershell
pnpm --filter @geofield/api test
pnpm --filter @geofield/api build
pnpm --filter @geofield/admin-web build
pnpm --filter @geofield/employee-mobile build
```
