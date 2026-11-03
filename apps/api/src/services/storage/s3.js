import { randomUUID } from "node:crypto";
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../../modules/auth/auth.service.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const client = env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
  ? new S3Client({ region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: env.S3_FORCE_PATH_STYLE, credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } })
  : null;

function fail(message, status, code) { throw new AuthError(message, status, code); }
function ensureConfigured() { if (!client || !env.S3_BUCKET) fail("Object storage is not configured.", 503, "STORAGE_NOT_CONFIGURED"); }
function validateMeta(data) {
  if (!allowedTypes.has(data.mimeType) || !Number.isInteger(data.fileSize) || data.fileSize < 1 || data.fileSize > maxFileSize) fail("Attachment type or size is not allowed.", 400, "INVALID_ATTACHMENT");
}
async function ownedSurvey(actor, surveyId) {
  const survey = await prisma.survey.findFirst({ where: { id: surveyId, organizationId: actor.organizationId, ...(actor.role === "EMPLOYEE" ? { employeeId: actor.userId } : {}) }, select: { id: true } });
  if (!survey) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
}

export async function createUpload(actor, surveyId, data) {
  ensureConfigured();
  validateMeta(data);
  await ownedSurvey(actor, surveyId);
  const objectKey = `surveys/${actor.organizationId}/${surveyId}/${randomUUID()}`;
  const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey, ContentType: data.mimeType, ContentLength: data.fileSize }), { expiresIn: 300 });
  const attachment = await prisma.surveyAttachment.create({ data: { surveyId, uploadedBy: actor.userId, originalFileName: data.originalFileName, objectKey, bucket: env.S3_BUCKET, mimeType: data.mimeType, fileSize: data.fileSize, checksum: data.checksum ?? null } });
  return { attachmentId: attachment.id, objectKey, uploadUrl: url, expiresIn: 300 };
}

export async function completeUpload(actor, surveyId, attachmentId) {
  ensureConfigured();
  await ownedSurvey(actor, surveyId);
  const attachment = await prisma.surveyAttachment.findFirst({ where: { id: attachmentId, surveyId, ...(actor.role === "EMPLOYEE" ? { uploadedBy: actor.userId } : {}) } });
  if (!attachment) fail("Attachment not found.", 404, "ATTACHMENT_NOT_FOUND");
  const head = await client.send(new HeadObjectCommand({ Bucket: attachment.bucket, Key: attachment.objectKey }));
  if (head.ContentLength !== attachment.fileSize || head.ContentType !== attachment.mimeType) fail("Uploaded object metadata does not match the declared attachment.", 400, "ATTACHMENT_VERIFICATION_FAILED");
  return prisma.surveyAttachment.update({ where: { id: attachment.id }, data: { uploadStatus: "COMPLETED", checksum: head.ETag?.replaceAll('"', "") ?? attachment.checksum } });
}

export async function listAttachments(actor, surveyId) {
  ensureConfigured();
  await ownedSurvey(actor, surveyId);
  const attachments = await prisma.surveyAttachment.findMany({ where: { surveyId, uploadStatus: "COMPLETED" }, orderBy: { createdAt: "asc" } });
  return Promise.all(attachments.map(async (attachment) => ({ ...attachment, previewUrl: await getSignedUrl(client, new GetObjectCommand({ Bucket: attachment.bucket, Key: attachment.objectKey }), { expiresIn: 300 }) })));
}

export async function deleteAttachment(actor, surveyId, attachmentId) {
  ensureConfigured();
  await ownedSurvey(actor, surveyId);
  const attachment = await prisma.surveyAttachment.findFirst({ where: { id: attachmentId, surveyId, ...(actor.role === "EMPLOYEE" ? { uploadedBy: actor.userId } : {}) } });
  if (!attachment) fail("Attachment not found.", 404, "ATTACHMENT_NOT_FOUND");
  await client.send(new DeleteObjectCommand({ Bucket: attachment.bucket, Key: attachment.objectKey }));
  await prisma.surveyAttachment.delete({ where: { id: attachment.id } });
}
