
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(currentDir, "../../.env"),
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      )}`,
    );
  }

  return result.data;
}

export const env = validateEnv();
