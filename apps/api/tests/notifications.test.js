import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    notification: { updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn(), upsert: vi.fn(), findFirst: vi.fn() },
    notificationPreference: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    notificationDelivery: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("../src/database/prisma.js", () => ({ prisma: prismaMock }));

import app from "../src/app.js";
import { markNotificationRead, createNotification, listNotifications } from "../src/modules/notifications/notifications.service.js";
import { notificationListSchema, preferenceBatchSchema, pushDeviceSchema } from "../src/modules/notifications/notifications.schemas.js";

const actor = { userId: "11111111-1111-4111-8111-111111111111", organizationId: "22222222-2222-4222-8222-222222222222", role: "EMPLOYEE" };

describe("notification access and validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication for notification routes", async () => {
    const response = await request(app).get("/api/v1/notifications").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("bounds pagination and rejects contradictory read filters", () => {
    expect(notificationListSchema.safeParse({ page: "1", pageSize: "100" }).success).toBe(true);
    expect(notificationListSchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(notificationListSchema.safeParse({ unreadOnly: "true", readOnly: "true" }).success).toBe(false);
  });

  it("rejects duplicate preference types and malformed Expo tokens", () => {
    const setting = { eventType: "SYNC_FAILED", inAppEnabled: true, pushEnabled: false };
    expect(preferenceBatchSchema.safeParse({ preferences: [setting, setting] }).success).toBe(false);
    expect(pushDeviceSchema.safeParse({ expoPushToken: "not-an-expo-token-which-is-long", devicePlatform: "ios" }).success).toBe(false);
  });

  it("uses recipient and organization from auth for mark-read and hides foreign IDs", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
    await expect(markNotificationRead(actor, "33333333-3333-4333-8333-333333333333")).rejects.toMatchObject({ statusCode: 404, code: "NOTIFICATION_NOT_FOUND" });
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "33333333-3333-4333-8333-333333333333", recipientId: actor.userId, organizationId: actor.organizationId } }));
  });

  it("paginates only the authenticated recipient's notifications", async () => {
    prismaMock.notificationPreference.findMany.mockResolvedValue([]);
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prismaMock.$transaction.mockImplementation((operations) => Promise.all(operations));
    const result = await listNotifications(actor, notificationListSchema.parse({ page: "2", pageSize: "10" }));
    expect(result.pagination).toMatchObject({ page: 2, pageSize: 10 });
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: actor.organizationId, recipientId: actor.userId }, skip: 10, take: 10 }));
  });

  it("keeps the in-app record when push is disabled and deduplicates by database key", async () => {
    prismaMock.notificationPreference.findUnique.mockResolvedValue(null);
    prismaMock.notification.upsert.mockResolvedValue({ id: "notification-id", eventType: "SYNC_FAILED" });
    prismaMock.notificationDelivery.upsert.mockResolvedValue({ status: "DISABLED" });
    await createNotification({ client: prismaMock, organizationId: actor.organizationId, recipientId: actor.userId, eventType: "SYNC_FAILED", title: "Sync failed", body: "Refresh your survey.", dedupeKey: "sync:event:employee" });
    expect(prismaMock.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { dedupeKey: "sync:event:employee" } }));
    expect(prismaMock.notificationDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "DISABLED", channel: "PUSH" }) }));
  });
});
