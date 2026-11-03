import { z } from "zod";

const uuid = z.string().uuid();
const surveyData = z.object({
  assignmentId: uuid,
  villageId: uuid,
  gatNumber: z.string().trim().min(1).max(80),
  plotNumber: z.string().trim().max(80).nullable().optional(),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  accuracy: z.number().finite().positive().max(10000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  capturedAt: z.coerce.date().optional(),
}).strict();

export const surveySyncSchema = z.object({
  clientSurveyId: uuid,
  clientEventId: uuid,
  version: z.number().int().min(1).default(1),
  surveyData,
}).strict();

export const attachmentSyncSchema = z.object({
  clientAttachmentId: uuid,
  surveyId: uuid,
  clientEventId: uuid,
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  checksum: z.string().trim().max(128).optional(),
}).strict();

export const syncListSchema = z.object({
  status: z.enum(["PROCESSED", "CONFLICT", "FAILED"]).optional(),
  entityType: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const resolveConflictSchema = z.object({
  strategy: z.enum(["KEEP_SERVER", "RETRY_CLIENT"]),
}).strict();
