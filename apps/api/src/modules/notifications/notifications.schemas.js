import { z } from "zod";
import { notificationTypes } from "./notifications.service.js";

const boolQuery = z.enum(["true", "false"]).transform((value) => value === "true");
export const notificationListSchema = z.object({
  unreadOnly: boolQuery.optional().default(false),
  readOnly: boolQuery.optional().default(false),
  type: z.enum(notificationTypes).optional(),
  category: z.enum(["ASSIGNMENT", "SURVEY", "ATTENDANCE", "SYNC", "SYSTEM"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(["createdAt", "type"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict().superRefine((value, context) => {
  if (value.unreadOnly && value.readOnly) context.addIssue({ code: "custom", path: ["readOnly"], message: "A notification cannot be both read and unread." });
});

export const preferenceSchema = z.object({
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean().default(false),
  emailEnabled: z.boolean().default(false),
}).strict();
export const preferenceBatchSchema = z.object({ preferences: z.array(z.object({ eventType: z.enum(notificationTypes), ...preferenceSchema.shape }).strict()).max(50) }).strict().superRefine(({ preferences }, context) => {
  if (new Set(preferences.map((item) => item.eventType)).size !== preferences.length) context.addIssue({ code: "custom", path: ["preferences"], message: "Each notification type may be updated only once." });
});

export const pushDeviceSchema = z.object({
  expoPushToken: z.string().trim().min(20).max(255).regex(/^Expo(nent)?PushToken\[[^\]]+\]$/),
  devicePlatform: z.enum(["ios", "android"]),
  deviceName: z.string().trim().max(120).optional(),
}).strict();

export const uuidParamSchema = z.string().uuid();
