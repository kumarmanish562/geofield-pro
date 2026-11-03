# Notification architecture

## Persistence and transaction model

`Notification` is durable in-app history. `NotificationDelivery` is the durable
external delivery queue and has a unique `(notificationId, channel)` key. The
business transaction writes its business state, audit record, notification,
and delivery row together. This means there is no gap between committing a
business event and recording the notification work. The same database-backed
delivery row serves as the outbox; a separate duplicate outbox table is not
needed.

`NotificationPreference` is per user and event type. `PushDevice` stores Expo
tokens privately and is never returned by the normal device listing API.
Notification metadata contains only event context needed by the client.
In-app preferences can hide non-critical assignment updates, deadline
reminders, and approvals from the user's in-app feed. Assignment publication,
survey rejection/correction requests, sync intervention, and attendance
updates remain visible in-app by policy.

## Delivery worker

The API process starts a bounded notification poller from `server.js`. It
periodically claims eligible `PENDING` / `RETRY_PENDING` deliveries, or claims
`PROCESSING` rows abandoned for more than five minutes. PostgreSQL row locks
with `SKIP LOCKED` prevent two API instances from claiming a row together.
The worker sends messages to the Expo push endpoint and records `SENT`,
`RETRY_PENDING`, `FAILED`, or `DISABLED`. Retries use exponential delay, have a
configurable maximum, and store only sanitized provider errors. Invalid Expo
device tokens are deactivated. In-app notification creation and availability
do not depend on external push delivery.

The same poller creates deadline reminders at configured day offsets. The
unique deduplication key includes assignment, reminder interval and recipient,
so polling does not create repeated reminders. No cron or in-memory queue is
used.

## Push and email

Expo push is optional and disabled by default. Mobile permission is requested
only after the user chooses **Enable push**. Expo project ID is read from the
mobile build's `EXPO_PUBLIC_EAS_PROJECT_ID`. The backend access token is
optional and must be supplied through deployment secrets if Expo project
security requires it. Email preferences are stored for forward compatibility,
but email delivery is not enabled because the repository has no mail provider.
Remote push requires an Expo development or production build with platform
credentials; Expo Go does not include remote push support.

## Reliability limits

The worker runs in each API instance and relies on PostgreSQL locking for
coordination. If all API instances are down, pending work remains persisted
until they restart. Expo tickets are recorded, but receipt polling and
provider-level idempotency are not implemented. A provider timeout after
acceptance can therefore result in a duplicate push; the in-app item remains
deduplicated and authoritative.
