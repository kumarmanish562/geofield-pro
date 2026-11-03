import { randomUUID } from "node:crypto";
import { NotificationType, notificationCategory } from "@geofield/shared-constants";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";

export const notificationTypes = Object.values(NotificationType);
const categoryFor = notificationCategory;
const mandatoryInAppTypes = [NotificationType.ASSIGNMENT_PUBLISHED, NotificationType.SURVEY_REJECTED, NotificationType.SURVEY_CORRECTION_REQUESTED, NotificationType.SYNC_FAILED, NotificationType.ATTENDANCE_UPDATE];
function fail(message, status, code) { throw new AuthError(message, status, code); }
function notificationSelect() { return { id: true, eventType: true, title: true, body: true, resourceType: true, resourceId: true, actionUrl: true, metadata: true, readAt: true, createdAt: true }; }

export async function createNotification({ client = prisma, organizationId, recipientId, actorId = null, eventType, title, body, resourceType = null, resourceId = null, actionUrl = null, metadata = {}, dedupeKey }) {
  const preference = await client.notificationPreference.findUnique({ where: { userId_eventType: { userId: recipientId, eventType } }, select: { inAppEnabled: true, pushEnabled: true } });
  const notification = await client.notification.upsert({
    where: { dedupeKey },
    create: { organizationId, recipientId, actorId, eventType, title, body, resourceType, resourceId, actionUrl, metadata, dedupeKey },
    update: {},
    select: notificationSelect(),
  });
  await client.notificationDelivery.upsert({
    where: { notificationId_channel: { notificationId: notification.id, channel: "PUSH" } },
    create: { notificationId: notification.id, channel: "PUSH", provider: "expo", status: preference?.pushEnabled ? "PENDING" : "DISABLED" },
    update: {},
  });
  return { ...notification, category: categoryFor(eventType) };
}

export async function createNotificationsForUsers(client, details, recipientIds) {
  const ids = [...new Set(recipientIds)];
  const active = ids.length ? await client.user.findMany({ where: { id: { in: ids }, organizationId: details.organizationId, status: "ACTIVE" }, select: { id: true } }) : [];
  return Promise.all(active.map(({ id }) => createNotification({ client, ...details, recipientId: id, dedupeKey: `${details.dedupeKey}:${id}` })));
}

function ownedWhere(actor, id) { return { id, recipientId: actor.userId, organizationId: actor.organizationId }; }
function toListItem(row) { return { ...row, category: categoryFor(row.eventType) }; }
export async function listNotifications(actor, filters) {
  const disabledTypes = (await prisma.notificationPreference.findMany({ where: { userId: actor.userId, inAppEnabled: false, eventType: { notIn: mandatoryInAppTypes } }, select: { eventType: true } })).map((row) => row.eventType);
  const typeFilters = [
    ...(disabledTypes.length ? [{ eventType: { notIn: disabledTypes } }] : []),
    ...(filters.type ? [{ eventType: filters.type }] : []),
    ...(filters.category ? [{ eventType: { startsWith: `${filters.category}_` } }] : []),
  ];
  const where = { organizationId: actor.organizationId, recipientId: actor.userId, ...(filters.unreadOnly ? { readAt: null } : {}), ...(filters.readOnly ? { readAt: { not: null } } : {}), ...(typeFilters.length ? { AND: typeFilters } : {}) };
  const unreadWhere = { organizationId: actor.organizationId, recipientId: actor.userId, readAt: null, ...(disabledTypes.length ? { eventType: { notIn: disabledTypes } } : {}) };
  const orderBy = filters.sortBy === "type" ? { eventType: filters.sortOrder } : { createdAt: filters.sortOrder };
  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({ where, select: notificationSelect(), orderBy: [orderBy, { id: "desc" }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: unreadWhere }),
  ]);
  return { notifications: items.map(toListItem), unreadCount, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}
export async function unreadCount(actor) {
  const disabledTypes = (await prisma.notificationPreference.findMany({ where: { userId: actor.userId, inAppEnabled: false, eventType: { notIn: mandatoryInAppTypes } }, select: { eventType: true } })).map((row) => row.eventType);
  return prisma.notification.count({ where: { organizationId: actor.organizationId, recipientId: actor.userId, readAt: null, ...(disabledTypes.length ? { eventType: { notIn: disabledTypes } } : {}) } });
}
export async function getNotification(actor, id) {
  const disabledTypes = (await prisma.notificationPreference.findMany({ where: { userId: actor.userId, inAppEnabled: false, eventType: { notIn: mandatoryInAppTypes } }, select: { eventType: true } })).map((row) => row.eventType);
  const row = await prisma.notification.findFirst({ where: { ...ownedWhere(actor, id), ...(disabledTypes.length ? { eventType: { notIn: disabledTypes } } : {}) }, select: notificationSelect() });
  if (!row) fail("Notification not found.", 404, "NOTIFICATION_NOT_FOUND");
  return toListItem(row);
}
export async function setNotificationRead(actor, id, isRead) {
  const updated = await prisma.notification.updateMany({ where: ownedWhere(actor, id), data: { readAt: isRead ? new Date() : null } });
  if (!updated.count) fail("Notification not found.", 404, "NOTIFICATION_NOT_FOUND");
  return { id, isRead };
}
export const markNotificationRead = (actor, id) => setNotificationRead(actor, id, true);
export const markNotificationUnread = (actor, id) => setNotificationRead(actor, id, false);
export async function markAllNotificationsRead(actor) {
  const result = await prisma.notification.updateMany({ where: { organizationId: actor.organizationId, recipientId: actor.userId, readAt: null }, data: { readAt: new Date() } });
  return { updated: result.count };
}
export async function deleteNotification(actor, id) {
  const result = await prisma.notification.deleteMany({ where: ownedWhere(actor, id) });
  if (!result.count) fail("Notification not found.", 404, "NOTIFICATION_NOT_FOUND");
  return { deleted: true };
}

export async function getPreferences(actor) {
  const saved = await prisma.notificationPreference.findMany({ where: { userId: actor.userId }, orderBy: { eventType: "asc" } });
  const byType = new Map(saved.map((row) => [row.eventType, row]));
  return notificationTypes.map((eventType) => ({ ...(byType.get(eventType) ?? { eventType, inAppEnabled: true, pushEnabled: false, emailEnabled: false }), ...(mandatoryInAppTypes.includes(eventType) ? { inAppEnabled: true } : {}) }));
}
export async function updatePreference(actor, eventType, data) {
  if (!notificationTypes.includes(eventType)) fail("Unknown notification type.", 400, "INVALID_NOTIFICATION_TYPE");
  if (mandatoryInAppTypes.includes(eventType)) data = { ...data, inAppEnabled: true };
  return prisma.notificationPreference.upsert({
    where: { userId_eventType: { userId: actor.userId, eventType } },
    create: { userId: actor.userId, eventType, ...data },
    update: data,
  });
}
export async function updatePreferences(actor, data) {
  const values = data.preferences;
  if (values.some((item) => !notificationTypes.includes(item.eventType))) fail("Unknown notification type.", 400, "INVALID_NOTIFICATION_TYPE");
  return prisma.$transaction(values.map(({ eventType, ...preference }) => prisma.notificationPreference.upsert({
    where: { userId_eventType: { userId: actor.userId, eventType } },
    create: { userId: actor.userId, eventType, ...preference, ...(mandatoryInAppTypes.includes(eventType) ? { inAppEnabled: true } : {}) },
    update: { ...preference, ...(mandatoryInAppTypes.includes(eventType) ? { inAppEnabled: true } : {}) },
  })));
}

export async function registerPushDevice(actor, data) {
  return prisma.pushDevice.upsert({
    where: { expoPushToken: data.expoPushToken },
    create: { userId: actor.userId, ...data, lastSeenAt: new Date() },
    update: { userId: actor.userId, devicePlatform: data.devicePlatform, deviceName: data.deviceName ?? null, isActive: true, lastSeenAt: new Date() },
    select: { id: true, devicePlatform: true, deviceName: true, isActive: true, lastSeenAt: true },
  });
}
export async function listPushDevices(actor) { return prisma.pushDevice.findMany({ where: { userId: actor.userId, isActive: true }, select: { id: true, devicePlatform: true, deviceName: true, lastSeenAt: true }, orderBy: { lastSeenAt: "desc" } }); }
export async function removePushDevice(actor, id) {
  const result = await prisma.pushDevice.updateMany({ where: { id, userId: actor.userId }, data: { isActive: false } });
  if (!result.count) fail("Device not found.", 404, "PUSH_DEVICE_NOT_FOUND");
  return { removed: true };
}

export async function adminOverview(actor) {
  if (!["ADMIN", "SUPERVISOR"].includes(actor.role)) fail("You cannot view notification operations.", 403, "NOTIFICATION_FORBIDDEN");
  const deliveryScope = actor.role === "SUPERVISOR" ? { notification: { organizationId: actor.organizationId, recipient: { employeeProfile: { supervisorId: actor.userId } } } } : { notification: { organizationId: actor.organizationId } };
  const [counts, recentFailures] = await Promise.all([
    prisma.notificationDelivery.groupBy({ by: ["status"], where: deliveryScope, _count: { _all: true } }),
    prisma.notificationDelivery.findMany({ where: { ...deliveryScope, status: "FAILED" }, select: { id: true, status: true, attemptCount: true, lastError: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
  ]);
  return { deliveries: Object.fromEntries(counts.map((row) => [row.status, row._count._all])), recentFailures };
}

export async function processDeliveryBatch({ client = prisma, fetchImpl = fetch, pushEnabled = false, expoApiUrl, expoAccessToken, batchSize = 50, maxAttempts = 5, retryBaseDelayMs = 30000 }) {
  if (!pushEnabled || !expoApiUrl) return { claimed: 0, delivered: 0, retried: 0, failed: 0 };
  const workerId = randomUUID();
  const claimed = await client.$queryRaw`
    WITH candidates AS (
      SELECT id FROM notification_deliveries
      WHERE channel = 'PUSH' AND (status IN ('PENDING', 'RETRY_PENDING') OR (status = 'PROCESSING' AND updated_at < NOW() - INTERVAL '5 minutes'))
        AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT ${batchSize}
    )
    UPDATE notification_deliveries d SET status = 'PROCESSING', attempt_count = d.attempt_count + 1,
      provider = COALESCE(provider, 'expo'), last_attempt_at = NOW(), updated_at = NOW()
    FROM candidates WHERE d.id = candidates.id
    RETURNING d.id, d.notification_id AS "notificationId", d.attempt_count AS "attemptCount", d.max_attempts AS "maxAttempts"
  `;
  let delivered = 0; let retried = 0; let failed = 0;
  for (const delivery of claimed) {
    const notification = await client.notification.findUnique({ where: { id: delivery.notificationId }, include: { recipient: { select: { id: true } } } });
    const devices = notification ? await client.pushDevice.findMany({ where: { userId: notification.recipientId, isActive: true }, select: { id: true, expoPushToken: true } }) : [];
    if (!devices.length) {
      await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "DISABLED", lastError: "No active push device is registered." } });
      continue;
    }
    let outcome = "success"; let providerMessageId = null; let errorMessage = null; const invalidTokens = [];
    try {
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;
      for (let offset = 0; offset < devices.length; offset += 100) {
        const batch = devices.slice(offset, offset + 100);
        const response = await fetchImpl(expoApiUrl, { method: "POST", headers, signal: AbortSignal.timeout(10000), body: JSON.stringify(batch.map((device) => ({ to: device.expoPushToken, title: notification.title, body: notification.body, data: { notificationId: notification.id, eventType: notification.eventType, resourceType: notification.resourceType, resourceId: notification.resourceId }, sound: "default" }))) });
        if (!response.ok) throw new Error(`Expo returned HTTP ${response.status}`);
        const result = await response.json();
        if (result.errors?.length) throw new Error("Expo rejected the notification batch.");
        if (!Array.isArray(result.data) || result.data.length !== batch.length) throw new Error("Expo returned an incomplete ticket response.");
        for (const [index, ticket] of result.data.entries()) {
          if (ticket.status === "error") {
            if (ticket.details?.error === "DeviceNotRegistered") invalidTokens.push(batch[index].id);
            outcome = "error"; errorMessage = ticket.message ?? "Push provider rejected delivery.";
          } else providerMessageId = ticket.id ?? providerMessageId;
        }
      }
    } catch (error) { outcome = "error"; errorMessage = error.name === "TimeoutError" ? "Push provider timed out." : "Push provider is temporarily unavailable."; }
    if (invalidTokens.length) await client.pushDevice.updateMany({ where: { id: { in: invalidTokens } }, data: { isActive: false } });
    if (outcome === "success") {
      await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", deliveredAt: new Date(), providerMessageId, lastError: null } }); delivered += 1;
    } else if (delivery.attemptCount >= Math.min(maxAttempts, delivery.maxAttempts)) {
      await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", failedAt: new Date(), lastError: errorMessage?.slice(0, 1000) } }); failed += 1;
    } else {
      const delay = retryBaseDelayMs * 2 ** Math.max(0, delivery.attemptCount - 1);
      await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "RETRY_PENDING", nextAttemptAt: new Date(Date.now() + delay), lastError: errorMessage?.slice(0, 1000) } }); retried += 1;
    }
  }
  return { claimed: claimed.length, delivered, retried, failed, workerId };
}
