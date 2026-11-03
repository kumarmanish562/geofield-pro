import { z } from "zod";

const uuid = z.string().uuid();
const coordinates = {
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  gpsAccuracy: z.coerce.number().finite().positive().max(10000),
};

export const surveyCreateSchema = z.object({
  assignmentId: uuid,
  villageId: uuid,
  gatNumber: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9./-]+$/),
  plotNumber: z.string().trim().max(80).regex(/^[A-Za-z0-9./-]+$/).optional().nullable(),
  ...coordinates,
  capturedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
}).strict();

export const surveyUpdateSchema = surveyCreateSchema.partial();
export const surveyListSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
  assignmentId: uuid.optional(),
  villageId: uuid.optional(),
  employeeId: uuid.optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();
export const submissionSchema = z.object({ idempotencyKey: z.string().trim().min(16).max(160) }).strict();
export const reviewSchema = z.object({
  reviewStatus: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.reviewStatus === "REJECTED" && !value.reviewNotes) {
    ctx.addIssue({ code: "custom", path: ["reviewNotes"], message: "A rejection reason is required." });
  }
});
export const attachmentSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  checksum: z.string().trim().max(128).optional(),
}).strict();
