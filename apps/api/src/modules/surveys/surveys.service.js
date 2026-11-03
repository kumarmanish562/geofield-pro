import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";

const reviewerRoles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST"];
const editableStatuses = ["DRAFT", "REJECTED"];

function fail(message, status, code) {
  throw new AuthError(message, status, code);
}

function ensureReviewer(actor) {
  if (!reviewerRoles.includes(actor.role)) fail("You cannot review surveys.", 403, "SURVEY_FORBIDDEN");
}

function includeSurvey() {
  return {
    employee: { select: { id: true, name: true, email: true } },
    assignment: { select: { id: true, name: true, status: true } },
    village: { select: { id: true, name: true, code: true } },
    attachments: { orderBy: { createdAt: "asc" } },
    reviews: { orderBy: { reviewedAt: "desc" }, include: { reviewer: { select: { id: true, name: true } } } },
  };
}

async function authorizedContext(actor, assignmentId, villageId) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      organizationId: actor.organizationId,
      status: { in: ["PUBLISHED", "PAUSED"] },
      ...(actor.role === "EMPLOYEE" ? { employees: { some: { employeeId: actor.userId } } } : {}),
    },
    select: { id: true, workArea: true },
  });
  if (!assignment) fail("The assignment is not available to this user.", 403, "SURVEY_ASSIGNMENT_FORBIDDEN");
  const village = await prisma.village.findFirst({
    where: { id: villageId, organizationId: actor.organizationId, status: "ACTIVE" },
    select: { id: true, name: true, code: true },
  });
  if (!village) fail("The village is not available.", 404, "SURVEY_VILLAGE_NOT_FOUND");
  if (actor.role === "EMPLOYEE" && assignment.workArea && ![village.code, village.name].includes(assignment.workArea)) {
    fail("The village is not authorized for this assignment.", 403, "SURVEY_VILLAGE_FORBIDDEN");
  }
  return { assignment, village };
}

function publicSurvey(survey) {
  return {
    ...survey,
    latitude: Number(survey.latitude),
    longitude: Number(survey.longitude),
    gpsAccuracy: Number(survey.gpsAccuracy),
  };
}

export async function createSurvey(actor, data) {
  const context = await authorizedContext(actor, data.assignmentId, data.villageId);
  const survey = await prisma.survey.create({
    data: {
      organizationId: actor.organizationId,
      surveyNumber: `SF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
      employeeId: actor.userId,
      assignmentId: context.assignment.id,
      villageId: context.village.id,
      gatNumber: data.gatNumber,
      plotNumber: data.plotNumber ?? null,
      latitude: data.latitude,
      longitude: data.longitude,
      gpsAccuracy: data.gpsAccuracy,
      capturedAt: data.capturedAt ?? new Date(),
      notes: data.notes ?? null,
    },
    include: includeSurvey(),
  });
  return publicSurvey(survey);
}

function surveyWhere(actor, id) {
  return { id, organizationId: actor.organizationId, ...(actor.role === "EMPLOYEE" ? { employeeId: actor.userId } : {}) };
}

export async function getSurvey(actor, id) {
  const survey = await prisma.survey.findFirst({ where: surveyWhere(actor, id), include: includeSurvey() });
  if (!survey) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  return publicSurvey(survey);
}

export async function listSurveys(actor, filters) {
  const where = {
    organizationId: actor.organizationId,
    ...(actor.role === "EMPLOYEE" ? { employeeId: actor.userId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.assignmentId ? { assignmentId: filters.assignmentId } : {}),
    ...(filters.villageId ? { villageId: filters.villageId } : {}),
    ...(filters.employeeId && actor.role !== "EMPLOYEE" ? { employeeId: filters.employeeId } : {}),
    ...(filters.search ? { OR: [{ surveyNumber: { contains: filters.search, mode: "insensitive" } }, { gatNumber: { contains: filters.search, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.survey.findMany({ where, include: includeSurvey(), orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    prisma.survey.count({ where }),
  ]);
  return { items: items.map(publicSurvey), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function updateSurvey(actor, id, data) {
  const existing = await prisma.survey.findFirst({ where: surveyWhere(actor, id) });
  if (!existing) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  if (!editableStatuses.includes(existing.status)) fail("Only draft or rejected surveys can be edited.", 409, "SURVEY_NOT_EDITABLE");
  if (actor.role === "EMPLOYEE" && (data.assignmentId || data.villageId)) {
    await authorizedContext(actor, data.assignmentId ?? existing.assignmentId, data.villageId ?? existing.villageId);
  }
  const updated = await prisma.survey.update({ where: { id }, data: { ...data, capturedAt: data.capturedAt ?? undefined }, include: includeSurvey() });
  return publicSurvey(updated);
}

export async function deleteSurvey(actor, id) {
  const existing = await prisma.survey.findFirst({ where: surveyWhere(actor, id), select: { id: true, status: true } });
  if (!existing) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  if (existing.status !== "DRAFT") fail("Only drafts can be deleted.", 409, "SURVEY_NOT_DELETABLE");
  await prisma.survey.delete({ where: { id } });
}

export async function submitSurvey(actor, id, idempotencyKey) {
  const existing = await prisma.survey.findFirst({ where: surveyWhere(actor, id), include: includeSurvey() });
  if (!existing) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  if (existing.status !== "DRAFT" && existing.submissionKey === idempotencyKey) return publicSurvey(existing);
  if (existing.status !== "DRAFT") fail("This survey has already been submitted.", 409, "SURVEY_ALREADY_SUBMITTED");
  if (!existing.gatNumber || existing.latitude === null || existing.longitude === null || existing.gpsAccuracy === null) {
    fail("The survey is missing required field data.", 400, "SURVEY_INCOMPLETE");
  }
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.survey.updateMany({
      where: { id, organizationId: actor.organizationId, employeeId: actor.userId, status: "DRAFT", submissionKey: null },
      data: { status: "SUBMITTED", submittedAt: new Date(), submissionKey: idempotencyKey },
    });
    if (updated.count === 0) {
      const retry = await tx.survey.findFirst({ where: surveyWhere(actor, id), include: includeSurvey() });
      if (retry?.submissionKey === idempotencyKey) return retry;
      fail("This survey was submitted by another request.", 409, "SURVEY_ALREADY_SUBMITTED");
    }
    return tx.survey.findUnique({ where: { id }, include: includeSurvey() });
  });
  return publicSurvey(result);
}

export async function reviewSurvey(actor, id, data) {
  ensureReviewer(actor);
  const survey = await prisma.survey.findFirst({ where: { id, organizationId: actor.organizationId }, select: { id: true, status: true } });
  if (!survey) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(survey.status)) fail("Only submitted surveys can be reviewed.", 409, "SURVEY_REVIEW_INVALID");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.surveyReview.create({ data: { surveyId: id, reviewedBy: actor.userId, reviewStatus: data.reviewStatus, reviewNotes: data.reviewNotes ?? null } });
    return tx.survey.update({ where: { id }, data: { status: data.reviewStatus }, include: includeSurvey() });
  });
  return publicSurvey(updated);
}

export async function listReviewQueue(actor, filters) {
  ensureReviewer(actor);
  return listSurveys(actor, { ...filters, status: "SUBMITTED" });
}
