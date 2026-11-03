import { z } from "zod";

const uuid = z.string().uuid();
const metadata = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(80),
  state: z.string().trim().max(120).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  taluka: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const villageCreateSchema = metadata.extend({ geometry: z.unknown().optional() });
export const villageUpdateSchema = metadata.partial().extend({ geometry: z.unknown().optional() });
export const villageListSchema = z.object({
  search: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  taluka: z.string().trim().max(120).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();
export const coordinateSchema = z.object({
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
}).strict();
export const importSchema = z.object({
  filename: z.string().trim().min(1).max(255).default("import.geojson"),
  geojson: z.unknown(),
}).strict();
export const intersectionSchema = z.object({
  geojson: z.unknown(),
}).strict();
export { uuid };
