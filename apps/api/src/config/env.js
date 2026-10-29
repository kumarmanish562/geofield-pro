
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// Load apps/api/.env before validating environment variables.
const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(currentDir, "../../.env"),
});

// Parse boolean environment variables safely.
const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

// Validate all API and authentication configuration.
const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  HOST: z.string().default("0.0.0.0"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Authentication and JWT
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),

  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must contain at least 32 characters"),

  // Argon2 password hashing
  ARGON2_MEMORY_COST: z.coerce.number().int().min(19456),
  ARGON2_TIME_COST: z.coerce.number().int().min(2),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1),

  // Refresh tokens
  REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(30),

  // Registration
  ALLOW_PUBLIC_REGISTRATION: booleanFromString.default(false),

  // CORS: comma-separated origins
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:5173"),

  // Authentication cookies
  AUTH_COOKIE_NAME: z.string().min(1),
  COOKIE_SECURE: booleanFromString.default(false),
  COOKIE_SAME_SITE: z
    .enum(["strict", "lax", "none"])
    .default("strict"),
  COOKIE_DOMAIN: z.string().optional().default(""),

  // Login rate limiting
  AUTH_LOGIN_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900000),

  AUTH_LOGIN_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .positive()
    .default(10),

  // Refresh rate limiting
  AUTH_REFRESH_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900000),

  AUTH_REFRESH_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .positive()
    .default(20),
});

// Validate without printing secret values.
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Environment configuration is invalid.");

  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }

  throw new Error("Invalid environment configuration");
}

// Export one immutable, validated configuration object.
export const env = Object.freeze({
  ...result.data,

  CORS_ORIGINS: result.data.CORS_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});
