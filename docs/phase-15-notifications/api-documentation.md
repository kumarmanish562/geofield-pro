# Notification API

All endpoints use the existing bearer-token authentication. Lists default to
25 results per page and cap `pageSize` at 100. Notification ownership is
always derived from the verified authentication context.

## In-app notifications

- `GET /api/v1/notifications?page=1&pageSize=25&unreadOnly=false&readOnly=false&type=...&category=...&sortBy=createdAt&sortOrder=desc`
- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/:id`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/:id/unread`
- `POST /api/v1/notifications/read-all`
- `PATCH /api/v1/notifications/read-all` (same operation)
- `DELETE /api/v1/notifications/:id`

The list response contains `notifications`, `unreadCount`, and pagination.
Unavailable and unowned IDs both return `NOTIFICATION_NOT_FOUND`.

## Preferences and devices

- `GET /api/v1/notification-preferences`
- `GET /api/v1/notification-preferences/:type`
- `PUT /api/v1/notification-preferences/:type`
- `PUT /api/v1/notification-preferences` with `{ "preferences": [...] }`
- `GET /api/v1/push-devices` (returns no push tokens)
- `POST /api/v1/push-devices/register`
- `DELETE /api/v1/push-devices/:id` (deactivates the owned token)

Preferences support `inAppEnabled`, `pushEnabled`, and `emailEnabled`. Email
delivery is not configured. Device registration accepts Expo push tokens and
`ios` / `android` platform values.

## Delivery operations

- `GET /api/v1/admin/notifications/overview`

Only administrators and supervisors can view delivery totals. Supervisors are
limited to employees directly assigned to them. Message bodies and Expo tokens
are not included.

## Event and delivery behavior

The documented event matrix is in `notification-event-matrix.md`. Expo push is
controlled by `NOTIFICATION_PUSH_ENABLED`; in-app records are created
regardless. Delivery attempts use configurable backoff and maximum attempts.
No internal provider credentials are returned by any API.
