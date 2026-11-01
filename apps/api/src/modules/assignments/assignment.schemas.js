import { z } from "zod";

const uuid = z.string().uuid();
const date = z.coerce.date();
const target = z.record(z.string(), z.number().int().min(0)).default({});

export const assignmentListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const assignmentFields = {
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  supervisorId: uuid.optional(),
  workArea: z.string().trim().max(200).nullable().optional(),
  startDate: date,
  dueDate: date,
  surveyRequirements: z.record(z.string(), z.unknown()).default({}),
  targets: target,
  employeeIds: z.array(uuid).max(500).default([]),
};

export const assignmentCreateSchema = z.object(assignmentFields).superRefine((value, context) => {
  if (value.dueDate < value.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["dueDate"], message: "Due date cannot be earlier than start date." });
  }
});

export const assignmentUpdateSchema = z.object({
  name: assignmentFields.name,
  description: assignmentFields.description,
  workArea: assignmentFields.workArea,
  startDate: assignmentFields.startDate,
  dueDate: assignmentFields.dueDate,
  surveyRequirements: assignmentFields.surveyRequirements,
  targets: assignmentFields.targets,
  supervisorId: assignmentFields.supervisorId.nullable(),
})
  .partial()
  .strict()
  .superRefine((value, context) => {
    if (value.startDate && value.dueDate && value.dueDate < value.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["dueDate"], message: "Due date cannot be earlier than start date." });
    }
  });

export const assignmentEmployeeSchema = z.object({ employeeId: uuid });
