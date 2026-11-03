import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../../modules/auth/auth.service.js";
import { recordAuthEvent } from "../../modules/auth/auth.audit.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
const uploadDirectory = isAbsolute(env.LOCAL_UPLOAD_DIR)
  ? env.LOCAL_UPLOAD_DIR
  : resolve(apiDirectory, env.LOCAL_UPLOAD_DIR);

function fail(message, status, code) {
  throw new AuthError(message, status, code);
}

function ensureLocalDevelopment() {
  if (env.NODE_ENV === "production") {
    fail(
      "Local attachment storage is disabled in production.",
      503,
      "LOCAL_STORAGE_DEVELOPMENT_ONLY",
    );
  }
}

function validateMeta(data) {
  if (
    !allowedTypes.has(data.mimeType) ||
    !Number.isInteger(data.fileSize) ||
    data.fileSize < 1 ||
    data.fileSize > maxFileSize
  ) {
    fail("Attachment type or size is not allowed.", 400, "INVALID_ATTACHMENT");
  }
}

function ensureImageSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer)) {
    fail("An image file is required.", 400, "INVALID_ATTACHMENT_CONTENT");
  }
  const valid =
    (mimeType === "image/jpeg" && buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (mimeType === "image/png" && buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mimeType === "image/webp" && buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP");
  if (!valid) {
    fail("Image content does not match its declared type.", 400, "ATTACHMENT_CONTENT_TYPE_MISMATCH");
  }
}

function objectPath(objectKey) {
  const path = resolve(uploadDirectory, objectKey);
  const fromRoot = relative(uploadDirectory, path);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    fail("Attachment storage path is invalid.", 400, "INVALID_ATTACHMENT_PATH");
  }
  return path;
}

function attachmentContentPath(actor, surveyId, attachmentId) {
  const prefix = actor.role === "EMPLOYEE" ? "/surveys" : "/admin/surveys";
  return `${prefix}/${surveyId}/attachments/${attachmentId}/content`;
}

async function ownedSurvey(actor, surveyId) {
  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      organizationId: actor.organizationId,
      ...(actor.role === "EMPLOYEE" ? { employeeId: actor.userId } : {}),
      ...(actor.role === "SUPERVISOR" ? { assignment: { supervisorId: actor.userId } } : {}),
    },
    select: { id: true },
  });
  if (!survey) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
}

export async function createUpload(actor, surveyId, data) {
  ensureLocalDevelopment();
  validateMeta(data);
  await ownedSurvey(actor, surveyId);

  if (data.clientAttachmentId) {
    const existing = await prisma.surveyAttachment.findUnique({
      where: { clientAttachmentId: data.clientAttachmentId },
    });
    if (existing) {
      if (existing.surveyId !== surveyId || existing.uploadedBy !== actor.userId) {
        fail("This attachment identifier is already in use.", 409, "ATTACHMENT_ID_REUSED");
      }
      return {
        attachmentId: existing.id,
        objectKey: existing.objectKey,
        status: existing.uploadStatus,
        duplicate: true,
        uploadPath: existing.uploadStatus === "COMPLETED" ? null : attachmentContentPath(actor, surveyId, existing.id),
      };
    }
  }

  const attachmentId = randomUUID();
  const objectKey = `surveys/${actor.organizationId}/${surveyId}/${attachmentId}`;
  const attachment = await prisma.surveyAttachment.create({
    data: {
      id: attachmentId,
      clientAttachmentId: data.clientAttachmentId ?? null,
      surveyId,
      uploadedBy: actor.userId,
      originalFileName: data.originalFileName,
      objectKey,
      bucket: "local",
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      checksum: data.checksum ?? null,
    },
  });
  return {
    attachmentId: attachment.id,
    objectKey,
    status: attachment.uploadStatus,
    uploadPath: attachmentContentPath(actor, surveyId, attachment.id),
  };
}

export async function uploadContent(actor, surveyId, attachmentId, buffer, mimeType) {
  ensureLocalDevelopment();
  await ownedSurvey(actor, surveyId);
  const attachment = await prisma.surveyAttachment.findFirst({
    where: {
      id: attachmentId,
      surveyId,
      ...(actor.role === "EMPLOYEE" ? { uploadedBy: actor.userId } : {}),
    },
  });
  if (!attachment) fail("Attachment not found.", 404, "ATTACHMENT_NOT_FOUND");
  if (attachment.uploadStatus === "COMPLETED") return attachment;
  validateMeta({ mimeType, fileSize: buffer?.length });
  if (mimeType !== attachment.mimeType || buffer.length !== attachment.fileSize) {
    fail("Uploaded content does not match the declared attachment.", 400, "ATTACHMENT_VERIFICATION_FAILED");
  }
  ensureImageSignature(buffer, mimeType);

  const destination = objectPath(attachment.objectKey);
  const temporaryPath = `${destination}.${randomUUID()}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporaryPath, buffer, { flag: "wx", mode: 0o600 });
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return prisma.surveyAttachment.update({
    where: { id: attachment.id },
    data: {
      uploadStatus: "COMPLETED",
      checksum: createHash("sha256").update(buffer).digest("hex"),
    },
  });
}

export async function completeUpload(actor, surveyId, attachmentId) {
  ensureLocalDevelopment();
  await ownedSurvey(actor, surveyId);
  const attachment = await prisma.surveyAttachment.findFirst({
    where: {
      id: attachmentId,
      surveyId,
      ...(actor.role === "EMPLOYEE" ? { uploadedBy: actor.userId } : {}),
    },
  });
  if (!attachment) fail("Attachment not found.", 404, "ATTACHMENT_NOT_FOUND");
  if (attachment.uploadStatus !== "COMPLETED") {
    fail("Attachment content has not been uploaded.", 409, "ATTACHMENT_NOT_UPLOADED");
  }
  return attachment;
}

export async function listAttachments(actor, surveyId) {
  ensureLocalDevelopment();
  await ownedSurvey(actor, surveyId);
  const attachments = await prisma.surveyAttachment.findMany({
    where: { surveyId, uploadStatus: "COMPLETED" },
    orderBy: { createdAt: "asc" },
  });
  await recordAuthEvent({
    event: "ATTACHMENT_ACCESSED",
    actorUserId: actor.userId,
    organizationId: actor.organizationId,
    targetType: "SurveyAttachment",
    targetId: surveyId,
    metadata: { surveyId, count: attachments.length },
  });
  return attachments.map((attachment) => ({
    ...attachment,
    previewUrl: attachmentContentPath(actor, surveyId, attachment.id),
  }));
}

export async function getAttachmentContent(actor, surveyId, attachmentId) {
  ensureLocalDevelopment();
  await ownedSurvey(actor, surveyId);
  const attachment = await prisma.surveyAttachment.findFirst({
    where: {
      id: attachmentId,
      surveyId,
      uploadStatus: "COMPLETED",
      ...(actor.role === "EMPLOYEE" ? { uploadedBy: actor.userId } : {}),
    },
    select: { objectKey: true, mimeType: true },
  });
  if (!attachment) fail("Attachment not found.", 404, "ATTACHMENT_NOT_FOUND");
  return { path: objectPath(attachment.objectKey), mimeType: attachment.mimeType };
}

export async function deleteAttachment(actor, surveyId, attachmentId) {
  ensureLocalDevelopment();
  await ownedSurvey(actor, surveyId);
  const attachment = await prisma.surveyAttachment.findFirst({
    where: {
      id: attachmentId,
      surveyId,
      ...(actor.role === "EMPLOYEE" ? { uploadedBy: actor.userId } : {}),
    },
  });
  if (!attachment) fail("Attachment not found.", 404, "ATTACHMENT_NOT_FOUND");
  await rm(objectPath(attachment.objectKey), { force: true });
  await prisma.surveyAttachment.delete({ where: { id: attachment.id } });
}

export { ensureImageSignature };
