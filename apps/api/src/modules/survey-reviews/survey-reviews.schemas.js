import { z } from "zod";

const uuid = z.string().uuid();

export const reviewListSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CORRECTION_REQUIRED"]).optional(),
  villageId: uuid.optional(),
  employeeId: uuid.optional(),
  search: z.string().trim().max(120).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict().superRefine((value, ctx) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date." });
  }
});

export const reviewCommentSchema = z.object({
  comments: z.string().trim().max(2000).optional().nullable(),
}).strict();

export const requiredCommentSchema = z.object({
  comments: z.string().trim().min(1).max(2000),
}).strict();
