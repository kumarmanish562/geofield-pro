import { z } from "zod";

const uuid = z.string().uuid();
export const reportFilterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  villageId: uuid.optional(),
  employeeId: uuid.optional(),
  assignmentId: uuid.optional(),
  reviewerId: uuid.optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CORRECTION_REQUIRED"]).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date." });
});
