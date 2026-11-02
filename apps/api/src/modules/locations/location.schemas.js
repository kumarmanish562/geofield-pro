import { z } from "zod";

const uuid = z.string().uuid();

export const observationSchema = z.object({
  eventId: z.string().trim().min(8).max(160),
  sessionId: uuid.optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().finite().min(0).max(10000).optional(),
  capturedAt: z.coerce.date(),
}).strict();

export const locationListSchema = z.object({
  employeeId: uuid.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
}).superRefine((value, context) => {
  if (value.from && value.to && value.to < value.from) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "The end time cannot be earlier than the start time." });
  }
});

export const trackingSessionSchema = z.object({ employeeId: uuid }).strict();
