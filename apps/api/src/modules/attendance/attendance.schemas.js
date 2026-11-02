import { z } from "zod";

const uuid = z.string().uuid();
const idempotencyKey = z.string().trim().min(8).max(160);
const clientDate = z.coerce.date().optional();

export const attendanceMutationSchema = z.object({
  idempotencyKey,
  clientEventId: idempotencyKey.optional(),
  clientOccurredAt: clientDate,
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const syncSchema = z.object({
  events: z.array(z.object({
    clientEventId: idempotencyKey,
    eventType: z.enum(["CHECK_IN", "BREAK_START", "BREAK_END", "CHECK_OUT"]),
    clientOccurredAt: z.coerce.date(),
    idempotencyKey: idempotencyKey.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).strict()).min(1).max(100),
}).strict();

export const attendanceHistorySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(["WORKING", "ON_BREAK", "COMPLETED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).superRefine((value, context) => {
  if (value.from && value.to && value.to < value.from) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "The end date cannot be earlier than the start date." });
  }
});

export const correctionCreateSchema = z.object({
  requestedCheckInAt: z.coerce.date().optional(),
  requestedCheckOutAt: z.coerce.date().optional(),
  reason: z.string().trim().min(10).max(1000),
}).strict().superRefine((value, context) => {
  if (!value.requestedCheckInAt && !value.requestedCheckOutAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["requestedCheckInAt"], message: "At least one corrected timestamp is required." });
  }
  if (value.requestedCheckInAt && value.requestedCheckOutAt && value.requestedCheckOutAt < value.requestedCheckInAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["requestedCheckOutAt"], message: "Check-out cannot be earlier than check-in." });
  }
});

export const correctionReviewSchema = z.object({
  reviewComment: z.string().trim().min(3).max(1000).optional(),
}).strict();

export const adminAttendanceSchema = attendanceHistorySchema.extend({
  employeeId: uuid.optional(),
  search: z.string().trim().max(100).optional(),
});
