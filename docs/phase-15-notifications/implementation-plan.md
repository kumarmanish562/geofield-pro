# Phase 15 implementation plan

## Repository findings

- The API is an Express ES module application under `apps/api`, mounted at
  `/api/v1`. JWT authentication fills `req.auth` with user, organization and
  role. Prisma/PostgreSQL transactions are already used for assignment,
  attendance and survey review workflows.
- PostgreSQL is the system of record. There is no Redis, queue service, mail
  provider, or separate scheduled-job service. API processes run in a
  container and shut down through `server.js`.
- Admin Web uses React/Vite, `apiClient`, `AppLayout`, and shared page states.
  Employee Mobile uses Expo, React Navigation, and a fetch API client that
  refreshes its existing secure session.
- Existing workflows include assignment publish/update, survey review,
  attendance check-in/out and correction review, and offline survey version
  conflicts. Those paths provide transaction boundaries for notification
  records and delivery rows.

## Implementation sequence

1. Extend Prisma models and add the corresponding SQL migration.
2. Add shared notification type/category constants and validate notification
   filters, preferences, and Expo device registrations with Zod.
3. Implement owner-scoped list/read/unread/delete APIs, preferences, device
   registration, and aggregate administrative delivery health.
4. Create notification and push-delivery rows in the same transaction as each
   covered business operation.
5. Run a polling delivery worker in the API process. Claim work with
   `FOR UPDATE SKIP LOCKED`, exponential retry delays, maximum attempts, and
   stale-claim recovery. Use Expo's push API only when configured.
6. Add the Admin Web bell, notification center and preference page.
7. Add the employee mobile notification tab, read state, refresh/pagination,
   preference controls, Expo registration, and notification response routing.
8. Verify migration/schema consistency, API tests, lint, formatting and app
   builds; record any provider or environment limitations.

## Authorization

Notification reads and mutations always use the authenticated `userId` and
`organizationId`. The API never accepts a recipient ID. An unowned or unknown
notification has the same 404 response. Push-device listing and deactivation
are restricted to the owner. Admin delivery summaries omit message bodies,
device tokens and provider credentials.
