import { createHash } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";
import { createNotification } from "../notifications/notifications.service.js";

function fail(message, status, code, details) {
  const error = new AuthError(message, status, code);
  if (details) error.details = details;
  throw error;
}

function hashPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function ensureAssignment(actor, data) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: data.assignmentId,
      organizationId: actor.organizationId,
      status: { in: ["PUBLISHED", "PAUSED"] },
      employees: { some: { employeeId: actor.userId } },
    },
    select: { id: true },
  });
  if (!assignment) fail("The assignment is not assigned to this employee.", 403, "UNAUTHORIZED_ASSIGNMENT");
  const village = await prisma.village.findFirst({
    where: { id: data.villageId, organizationId: actor.organizationId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!village) fail("The village is not available.", 403, "UNAUTHORIZED_VILLAGE");
}

function result(survey, status = "SYNCED") {
  return {
    surveyId: survey.id,
    clientSurveyId: survey.clientSurveyId,
    serverVersion: survey.serverVersion,
    serverTimestamp: survey.updatedAt,
    status,
  };
}

export async function syncSurvey(actor, input) {
  await ensureAssignment(actor, input.surveyData);
  const payloadHash = hashPayload(input);
  const duplicateEvent = await prisma.syncEvent.findUnique({ where: { clientEventId: input.clientEventId } });
  if (duplicateEvent) {
    if (
      duplicateEvent.employeeId !== actor.userId ||
      duplicateEvent.entityId !== input.clientSurveyId ||
      duplicateEvent.payloadHash !== payloadHash
    ) {
      fail("The synchronization event cannot be reused.", 409, "SYNC_EVENT_REUSED");
    }

    const survey = await prisma.survey.findFirst({
      where: {
        clientSurveyId: input.clientSurveyId,
        employeeId: actor.userId,
        organizationId: actor.organizationId,
      },
    });
    if (survey) return result(survey, duplicateEvent.status === "CONFLICT" ? "CONFLICT" : "SYNCED");
    fail("The synchronization event was already processed.", 409, "DUPLICATE_SYNC_EVENT");
  }

  const existing = await prisma.survey.findUnique({
    where: { clientSurveyId: input.clientSurveyId },
  });
  if (
    existing &&
    (existing.employeeId !== actor.userId ||
      existing.organizationId !== actor.organizationId)
  ) {
    fail("This offline survey identifier is already in use.", 409, "SURVEY_ID_REUSED");
  }
  if (existing && existing.serverVersion !== input.version) {
    const event = await prisma.$transaction(async (tx) => {
      const syncEvent = await tx.syncEvent.create({
        data: { clientEventId: input.clientEventId, employeeId: actor.userId, entityType: "SURVEY", entityId: input.clientSurveyId, operation: "UPSERT", payloadHash, payload: input, status: "CONFLICT" },
      });
      await createNotification({ client: tx, organizationId: actor.organizationId, recipientId: actor.userId, eventType: "SYNC_FAILED", title: "Survey sync needs your attention", body: "A survey changed on the server while you were offline. Refresh the survey and retry your updates.", resourceType: "SYNC_EVENT", resourceId: syncEvent.id, actionUrl: "/sync", metadata: { entityType: "SURVEY", errorCategory: "VERSION_CONFLICT", recovery: "Refresh the server copy before retrying." }, dedupeKey: `sync:${syncEvent.id}:intervention` });
      return syncEvent;
    });
    return { ...result(existing, "CONFLICT"), conflict: { entityId: existing.id, clientVersion: input.version, serverVersion: existing.serverVersion, eventId: event.id } };
  }
  const saved = await prisma.$transaction(async (tx) => {
    const survey = existing
      ? await tx.survey.update({
        where: { id: existing.id },
        data: {
          assignmentId: input.surveyData.assignmentId,
          villageId: input.surveyData.villageId,
          gatNumber: input.surveyData.gatNumber,
          plotNumber: input.surveyData.plotNumber ?? null,
          latitude: input.surveyData.latitude ?? null,
          longitude: input.surveyData.longitude ?? null,
          gpsAccuracy: input.surveyData.accuracy ?? null,
          capturedAt: input.surveyData.capturedAt ?? existing.capturedAt,
          notes: input.surveyData.notes ?? null,
          serverVersion: { increment: 1 },
        },
      })
      : await tx.survey.create({
        data: {
          organizationId: actor.organizationId,
          employeeId: actor.userId,
          clientSurveyId: input.clientSurveyId,
          surveyNumber: `OFF-${input.clientSurveyId.slice(0, 8).toUpperCase()}`,
          assignmentId: input.surveyData.assignmentId,
          villageId: input.surveyData.villageId,
          gatNumber: input.surveyData.gatNumber,
          plotNumber: input.surveyData.plotNumber ?? null,
          latitude: input.surveyData.latitude ?? null,
          longitude: input.surveyData.longitude ?? null,
          gpsAccuracy: input.surveyData.accuracy ?? null,
          capturedAt: input.surveyData.capturedAt ?? new Date(),
          notes: input.surveyData.notes ?? null,
        },
      });
    await tx.syncEvent.create({
      data: { clientEventId: input.clientEventId, employeeId: actor.userId, entityType: "SURVEY", entityId: input.clientSurveyId, operation: existing ? "UPDATE" : "CREATE", payloadHash, payload: input, status: "PROCESSED" },
    });
    await tx.syncHistory.create({
      data: { employeeId: actor.userId, entityType: "SURVEY", entityId: input.clientSurveyId, operation: existing ? "UPDATE" : "CREATE", attemptNumber: 1, startedAt: new Date(), completedAt: new Date(), result: "SYNCED", serverResponse: result(survey) },
    });
    return survey;
  });
  return result(saved);
}

export async function syncAttachment(actor, input) {
  const survey = await prisma.survey.findFirst({ where: { id: input.surveyId, organizationId: actor.organizationId, employeeId: actor.userId }, select: { id: true } });
  if (!survey) fail("Survey is not owned by this employee.", 403, "SURVEY_FORBIDDEN");
  const existing = await prisma.surveyAttachment.findUnique({ where: { clientAttachmentId: input.clientAttachmentId } });
  if (existing) {
    if (existing.surveyId !== input.surveyId || existing.uploadedBy !== actor.userId) {
      fail("This attachment identifier is already in use.", 409, "ATTACHMENT_ID_REUSED");
    }
    return { attachmentId: existing.id, status: "SYNCED", duplicate: true };
  }
  const event = await prisma.syncEvent.findUnique({ where: { clientEventId: input.clientEventId } });
  if (event) fail("The synchronization event was already processed.", 409, "DUPLICATE_SYNC_EVENT");
  return { status: "READY_FOR_UPLOAD", clientAttachmentId: input.clientAttachmentId };
}

export async function syncStatus(actor) {
  const [events, history] = await prisma.$transaction([
    prisma.syncEvent.findMany({ where: { employeeId: actor.userId }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.syncHistory.findFirst({ where: { employeeId: actor.userId, result: "SYNCED" }, orderBy: { completedAt: "desc" } }),
  ]);
  return {
    pendingSurveys: 0,
    synchronizedSurveys: events.filter((item) => item.entityType === "SURVEY" && item.status === "PROCESSED").length,
    failedRecords: events.filter((item) => item.status === "FAILED").length,
    conflicts: events.filter((item) => item.status === "CONFLICT").length,
    pendingAttachments: 0,
    failedAttachments: 0,
    lastSuccessfulSynchronization: history?.completedAt ?? null,
  };
}

export async function syncHistory(actor, filters) {
  const where = { employeeId: actor.userId, ...(filters.status ? { result: filters.status === "PROCESSED" ? "SYNCED" : filters.status } : {}), ...(filters.entityType ? { entityType: filters.entityType } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.syncHistory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    prisma.syncHistory.count({ where }),
  ]);
  return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function listConflicts(actor) {
  return prisma.syncEvent.findMany({ where: { employeeId: actor.userId, status: "CONFLICT" }, orderBy: { createdAt: "desc" } });
}

export async function resolveConflict(actor, eventId, strategy) {
  const event = await prisma.syncEvent.findFirst({ where: { id: eventId, employeeId: actor.userId, status: "CONFLICT" } });
  if (!event) fail("Synchronization conflict not found.", 404, "SYNC_CONFLICT_NOT_FOUND");
  if (strategy === "KEEP_SERVER") {
    await prisma.syncEvent.update({ where: { id: event.id }, data: { status: "PROCESSED" } });
    return { eventId, status: "RESOLVED", strategy };
  }
  fail("Retry the original client operation after refreshing the server version.", 409, "SYNC_RETRY_REQUIRES_REFRESH");
}
