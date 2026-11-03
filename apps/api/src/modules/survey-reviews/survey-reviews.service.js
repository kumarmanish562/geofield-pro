import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";
import { recordAuthEvent } from "../auth/auth.audit.js";
import { createNotification } from "../notifications/notifications.service.js";

const reviewerRoles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST"];

function fail(message, status, code) {
  throw new AuthError(message, status, code);
}

function ensureReviewer(actor) {
  if (!reviewerRoles.includes(actor.role)) fail("You cannot review surveys.", 403, "SURVEY_REVIEW_FORBIDDEN");
}

function assignmentScope(actor) {
  if (actor.role === "SUPERVISOR") return { supervisorId: actor.userId };
  return {};
}

function includeSurvey() {
  return {
    employee: { select: { id: true, name: true, email: true, employeeProfile: { select: { employeeCode: true } } } },
    assignment: { select: { id: true, name: true, status: true, supervisorId: true } },
    village: { select: { id: true, name: true, code: true } },
    attachments: { orderBy: { createdAt: "asc" } },
  };
}

function publicSurvey(survey) {
  return {
    ...survey,
    latitude: survey.latitude === null ? null : Number(survey.latitude),
    longitude: survey.longitude === null ? null : Number(survey.longitude),
    gpsAccuracy: survey.gpsAccuracy === null ? null : Number(survey.gpsAccuracy),
  };
}

function whereFor(actor, id) {
  return { id, organizationId: actor.organizationId, assignment: assignmentScope(actor) };
}

export async function listReviews(actor, filters) {
  ensureReviewer(actor);
  const where = {
    organizationId: actor.organizationId,
    assignment: assignmentScope(actor),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.villageId ? { villageId: filters.villageId } : {}),
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters.startDate || filters.endDate ? { submittedAt: { ...(filters.startDate ? { gte: filters.startDate } : {}), ...(filters.endDate ? { lte: filters.endDate } : {}) } } : {}),
    ...(filters.search ? { OR: [{ surveyNumber: { contains: filters.search, mode: "insensitive" } }, { gatNumber: { contains: filters.search, mode: "insensitive" } }, { employee: { name: { contains: filters.search, mode: "insensitive" } } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.survey.findMany({ where, include: includeSurvey(), orderBy: [{ submittedAt: "desc" }, { id: "desc" }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    prisma.survey.count({ where }),
  ]);
  return { items: items.map(publicSurvey), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

async function getReviewableSurvey(actor, id) {
  ensureReviewer(actor);
  const survey = await prisma.survey.findFirst({ where: whereFor(actor, id), include: includeSurvey() });
  if (!survey) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  return survey;
}

export async function getReview(actor, id) {
  const survey = await getReviewableSurvey(actor, id);
  return publicSurvey(survey);
}

export async function getHistory(actor, id) {
  const survey = actor.role === "EMPLOYEE"
    ? await prisma.survey.findFirst({ where: { id, organizationId: actor.organizationId, employeeId: actor.userId }, select: { id: true } })
    : await getReviewableSurvey(actor, id);
  if (!survey) fail("Survey not found.", 404, "SURVEY_NOT_FOUND");
  return prisma.surveyReview.findMany({
    where: { surveyId: id },
    orderBy: { reviewedAt: "asc" },
    include: { reviewer: { select: { id: true, name: true, email: true, role: true } } },
  });
}

async function transition(actor, id, newStatus, action, comments) {
  const survey = await getReviewableSurvey(actor, id);
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(survey.status)) fail("This survey is not available for review.", 409, "SURVEY_REVIEW_INVALID");
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.survey.update({ where: { id }, data: { status: newStatus }, include: includeSurvey() });
    await tx.surveyReview.create({ data: { surveyId: id, reviewedBy: actor.userId, reviewStatus: newStatus, action, previousStatus: survey.status, newStatus, reviewNotes: comments ?? null } });
    await recordAuthEvent({ client: tx, event: action === "APPROVE" ? "SURVEY_APPROVED" : action === "REJECT" ? "SURVEY_REJECTED" : "CORRECTION_REQUESTED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "Survey", targetId: id, metadata: { previousStatus: survey.status, newStatus, comments: comments ?? null } });
    const eventType = newStatus === "APPROVED" ? "SURVEY_APPROVED" : newStatus === "REJECTED" ? "SURVEY_REJECTED" : "SURVEY_CORRECTION_REQUESTED";
    const reason = comments?.trim();
    await createNotification({ client: tx, organizationId: actor.organizationId, recipientId: survey.employee.id, actorId: actor.userId, eventType, title: eventType === "SURVEY_APPROVED" ? "Survey approved" : eventType === "SURVEY_REJECTED" ? "Survey rejected" : "Survey corrections requested", body: eventType === "SURVEY_APPROVED" ? "Your survey has been approved." : `${eventType === "SURVEY_REJECTED" ? "Your survey was rejected" : "Your survey needs corrections"}.${reason ? ` Reviewer note: ${reason.slice(0, 500)}` : ""}`, resourceType: "SURVEY", resourceId: id, actionUrl: `/surveys/${id}`, metadata: { surveyNumber: survey.surveyNumber }, dedupeKey: `survey:${id}:${eventType}:${newStatus}` });
    return updated;
  });
  return publicSurvey(result);
}

export const approveSurvey = (actor, id, comments) => transition(actor, id, "APPROVED", "APPROVE", comments);
export const rejectSurvey = (actor, id, comments) => transition(actor, id, "REJECTED", "REJECT", comments);
export const requestCorrection = (actor, id, comments) => transition(actor, id, "CORRECTION_REQUIRED", "REQUEST_CORRECTION", comments);
