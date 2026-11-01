import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) =>
    value.toLowerCase()
  ),
  password: z.string().min(1).max(256),
  clientType: z.enum(["web", "mobile"]),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
});

export const invitationAcceptanceSchema = z.object({
  token: z.string().min(32).max(512),
  name: z.string().trim().min(2).max(150),
  password: z.string().min(12).max(128),
  clientType: z.enum(["web", "mobile"]),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
});