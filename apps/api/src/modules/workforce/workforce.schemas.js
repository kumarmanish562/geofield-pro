import { z } from "zod";

const uuid = z.string().uuid();

export const employeeListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["PENDING", "ACTIVE", "DISABLED", "LOCKED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const employeeUpdateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  employeeCode: z.string().trim().max(50).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  supervisorId: uuid.nullable().optional(),
}).strict();

export const invitationCreateSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["EMPLOYEE", "SUPERVISOR", "GIS_ANALYST"]).default("EMPLOYEE"),
});

export const teamListSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const teamCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  supervisorId: uuid.nullable().optional(),
});

export const teamUpdateSchema = teamCreateSchema.extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
}).strict();

export const membershipSchema = z.object({ userId: uuid });
