import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";
import { broadcastLocationObservation } from "./location.socket.js";

const FRESHNESS_MS = 5 * 60 * 1000;

function fail(message, status, code) {
  throw new AuthError(message, status, code);
}

function ensureEmployee(actor) {
  if (actor.role !== "EMPLOYEE") fail("Only employees can submit location observations.", 403, "LOCATION_FORBIDDEN");
}

function ensureAdmin(actor) {
  if (!["ADMIN", "SUPERVISOR"].includes(actor.role)) fail("You cannot manage location tracking.", 403, "LOCATION_FORBIDDEN");
}

function withFreshness(item) {
  if (!item) return null;
  const ageMs = Date.now() - new Date(item.receivedAt).getTime();
  return { ...item, freshness: ageMs <= FRESHNESS_MS ? "ACTIVE" : "STALE", freshnessAgeSeconds: Math.max(0, Math.floor(ageMs / 1000)) };
}

async function activeSession(actor, sessionId) {
  const session = await prisma.trackingSession.findFirst({
    where: { organizationId: actor.organizationId, employeeId: actor.userId, status: "ACTIVE", ...(sessionId ? { id: sessionId } : {}) },
  });
  if (!session) fail("Location tracking is not authorized for an active session.", 403, "TRACKING_NOT_AUTHORIZED");
  return session;
}

export async function startTrackingSession(actor, employeeId) {
  ensureAdmin(actor);
  const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: actor.organizationId, role: "EMPLOYEE", status: "ACTIVE" }, select: { id: true } });
  if (!employee) fail("Employee not found in this organization.", 404, "EMPLOYEE_NOT_FOUND");
  const existing = await prisma.trackingSession.findFirst({ where: { employeeId, organizationId: actor.organizationId, status: "ACTIVE" } });
  if (existing) return existing;
  return prisma.trackingSession.create({ data: { organizationId: actor.organizationId, employeeId, startedById: actor.userId } });
}

export async function endTrackingSession(actor, sessionId) {
  ensureAdmin(actor);
  const session = await prisma.trackingSession.findFirst({ where: { id: sessionId, organizationId: actor.organizationId, status: "ACTIVE" } });
  if (!session) fail("Active tracking session not found.", 404, "TRACKING_SESSION_NOT_FOUND");
  return prisma.trackingSession.update({ where: { id: sessionId }, data: { status: "ENDED", endedAt: new Date() } });
}

export async function createObservation(actor, data) {
  ensureEmployee(actor);
  const session = await activeSession(actor, data.sessionId);
  const existing = await prisma.locationObservation.findUnique({ where: { employeeId_eventId: { employeeId: actor.userId, eventId: data.eventId } } });
  if (existing) return withFreshness(existing);
  const receivedAt = new Date();
  let observation;
  try {
    observation = await prisma.$transaction(async (tx) => {
      const id = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "location_observations"
          ("id", "organization_id", "employee_id", "session_id", "event_id", "latitude", "longitude", "accuracy_meters", "captured_at", "received_at", "created_at", "location_point")
        VALUES
          (${id}::uuid, ${actor.organizationId}::uuid, ${actor.userId}::uuid, ${session.id}::uuid, ${data.eventId}, ${data.latitude}, ${data.longitude}, ${data.accuracyMeters ?? null}, ${data.capturedAt}, ${receivedAt}, ${receivedAt}, ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography)
      `;
      return tx.locationObservation.findUnique({ where: { id }, include: { employee: { select: { id: true, name: true, email: true } } } });
    });
  } catch (error) {
    if (error.code === "P2002" || error.message?.includes("location_observations_employee_id_event_id_key")) {
      const duplicate = await prisma.locationObservation.findUnique({ where: { employeeId_eventId: { employeeId: actor.userId, eventId: data.eventId } } });
      if (duplicate) return withFreshness(duplicate);
    }
    throw error;
  }
  const result = withFreshness(observation);
  broadcastLocationObservation(result);
  return result;
}

export async function listMine(actor, filters) {
  ensureEmployee(actor);
  const where = { organizationId: actor.organizationId, employeeId: actor.userId, ...(filters.from || filters.to ? { capturedAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}) };
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.locationObservation.findMany({ where, orderBy: { capturedAt: "desc" }, skip, take: filters.pageSize }),
    prisma.locationObservation.count({ where }),
  ]);
  return { items: items.map(withFreshness), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function latestForAdmin(actor) {
  ensureAdmin(actor);
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT ON (lo.employee_id)
      lo.id, lo.organization_id AS "organizationId", lo.employee_id AS "employeeId", lo.latitude, lo.longitude,
      lo.accuracy_meters AS "accuracyMeters", lo.captured_at AS "capturedAt",
      lo.received_at AS "receivedAt", u.name AS "employeeName", u.email AS "employeeEmail",
      ts.id AS "sessionId", ts.status AS "sessionStatus"
    FROM location_observations lo
    JOIN users u ON u.id = lo.employee_id
    JOIN tracking_sessions ts ON ts.id = lo.session_id
    WHERE lo.organization_id = ${actor.organizationId}::uuid
      AND u.status = 'ACTIVE'
    ORDER BY lo.employee_id, lo.received_at DESC
  `;
  return rows.map(withFreshness);
}

export async function historyForAdmin(actor, filters) {
  ensureAdmin(actor);
  const where = { organizationId: actor.organizationId, ...(filters.employeeId ? { employeeId: filters.employeeId } : {}), ...(filters.from || filters.to ? { capturedAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}) };
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.locationObservation.findMany({ where, include: { employee: { select: { id: true, name: true, email: true } } }, orderBy: { capturedAt: "desc" }, skip, take: filters.pageSize }),
    prisma.locationObservation.count({ where }),
  ]);
  return { items: items.map(withFreshness), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function trackingSessionsForAdmin(actor) {
  ensureAdmin(actor);
  return prisma.trackingSession.findMany({ where: { organizationId: actor.organizationId }, include: { employee: { select: { id: true, name: true, email: true } } }, orderBy: { startedAt: "desc" }, take: 100 });
}

export async function currentTrackingSession(actor) {
  ensureEmployee(actor);
  return prisma.trackingSession.findFirst({ where: { organizationId: actor.organizationId, employeeId: actor.userId, status: "ACTIVE" }, orderBy: { startedAt: "desc" } });
}
