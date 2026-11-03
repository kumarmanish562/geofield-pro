import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";
import { createNotification } from "../notifications/notifications.service.js";

function fail(message, status, code) {
  throw new AuthError(message, status, code);
}

function utcDate(value = new Date()) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ensureEmployee(actor) {
  if (actor.role !== "EMPLOYEE") fail("Only employees can perform attendance actions.", 403, "ATTENDANCE_FORBIDDEN");
}

function ensureReviewer(actor) {
  if (!["ADMIN", "SUPERVISOR"].includes(actor.role)) fail("You cannot review attendance.", 403, "ATTENDANCE_REVIEW_FORBIDDEN");
}

function includeAttendance() {
  return {
    employee: { select: { id: true, name: true, email: true } },
    breaks: { orderBy: { startedAt: "asc" } },
    events: { orderBy: { serverOccurredAt: "asc" } },
    corrections: { orderBy: { createdAt: "desc" }, take: 20 },
  };
}

function serialize(attendance) {
  const grossSeconds = attendance.checkedInAt
    ? Math.max(0, Math.floor(((attendance.checkedOutAt ?? new Date()).getTime() - attendance.checkedInAt.getTime()) / 1000))
    : 0;
  const activeBreak = attendance.breaks.find((item) => !item.endedAt);
  const completedBreakSeconds = attendance.breaks.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
  return { ...attendance, grossSeconds, totalBreakSeconds: completedBreakSeconds, netSeconds: Math.max(0, grossSeconds - completedBreakSeconds), activeBreak };
}

async function existingIdempotent(actor, key) {
  if (!key) return null;
  const event = await prisma.attendanceEvent.findFirst({ where: { idempotencyKey: key, employeeId: actor.userId }, include: { attendance: { include: includeAttendance() } } });
  return event ? serialize(event.attendance) : null;
}

async function audit(tx, attendance, actor, action, beforeState, afterState, reason) {
  await tx.attendanceAuditLog.create({
    data: { organizationId: attendance.organizationId, attendanceId: attendance.id, actorId: actor.userId, action, beforeState, afterState, reason },
  });
}

async function event(tx, attendance, actor, data, serverOccurredAt, processingStatus = "PROCESSED") {
  return tx.attendanceEvent.create({
    data: {
      attendanceId: attendance.id,
      employeeId: actor.userId,
      eventType: data.eventType,
      serverOccurredAt,
      clientOccurredAt: data.clientOccurredAt ?? null,
      processingStatus,
      idempotencyKey: data.idempotencyKey ?? null,
      clientEventId: data.clientEventId ?? null,
      metadata: data.metadata ?? undefined,
    },
  });
}

async function currentForEmployee(actor, tx = prisma) {
  return tx.attendance.findFirst({
    where: { employeeId: actor.userId, organizationId: actor.organizationId, attendanceDate: utcDate(), status: { in: ["WORKING", "ON_BREAK"] } },
    include: includeAttendance(),
  });
}

export async function checkIn(actor, data) {
  ensureEmployee(actor);
  const duplicate = await existingIdempotent(actor, data.idempotencyKey);
  if (duplicate) return duplicate;
  const now = new Date();
  const attendanceDate = utcDate(now);
  try {
    return serialize(await prisma.$transaction(async (tx) => {
      const current = await tx.attendance.findFirst({ where: { employeeId: actor.userId, organizationId: actor.organizationId, attendanceDate } });
      if (current) fail("Attendance has already been started for today.", 409, "ATTENDANCE_ALREADY_STARTED");
      const attendance = await tx.attendance.create({ data: { organizationId: actor.organizationId, employeeId: actor.userId, attendanceDate, status: "WORKING", checkedInAt: now } });
      await event(tx, attendance, actor, { ...data, eventType: "CHECK_IN" }, now);
      await audit(tx, attendance, actor, "CHECK_IN", null, { status: "WORKING", checkedInAt: now.toISOString() });
      return tx.attendance.findUnique({ where: { id: attendance.id }, include: includeAttendance() });
    }));
  } catch (error) {
    if (error.code === "P2002") fail("Attendance has already been started for today.", 409, "ATTENDANCE_ALREADY_STARTED");
    throw error;
  }
}

export async function startBreak(actor, data) {
  return transition(actor, data, "WORKING", "ON_BREAK", "BREAK_START", async (tx, attendance, now) => {
    await tx.attendanceBreak.create({ data: { attendanceId: attendance.id, startedAt: now } });
  });
}

export async function endBreak(actor, data) {
  return transition(actor, data, "ON_BREAK", "WORKING", "BREAK_END", async (tx, attendance, now) => {
    const active = await tx.attendanceBreak.findFirst({ where: { attendanceId: attendance.id, endedAt: null }, orderBy: { startedAt: "desc" } });
    if (!active) fail("There is no active break.", 409, "BREAK_NOT_ACTIVE");
    const durationSeconds = Math.max(0, Math.floor((now.getTime() - active.startedAt.getTime()) / 1000));
    await tx.attendanceBreak.update({ where: { id: active.id }, data: { endedAt: now, durationSeconds } });
    await tx.attendance.update({ where: { id: attendance.id }, data: { totalBreakSeconds: { increment: durationSeconds } } });
  });
}

export async function checkOut(actor, data) {
  return transition(actor, data, "WORKING", "COMPLETED", "CHECK_OUT", async (tx, attendance, now) => {
    await tx.attendance.update({ where: { id: attendance.id }, data: { checkedOutAt: now } });
  });
}

async function transition(actor, data, expected, next, eventType, beforeUpdate) {
  ensureEmployee(actor);
  const duplicate = await existingIdempotent(actor, data.idempotencyKey);
  if (duplicate) return duplicate;
  const current = await currentForEmployee(actor);
  if (!current) fail("No active attendance session exists.", 409, "ATTENDANCE_NOT_ACTIVE");
  if (current.status !== expected) fail(`Attendance cannot transition from ${current.status}.`, 409, "INVALID_ATTENDANCE_TRANSITION");
  const now = new Date();
  return serialize(await prisma.$transaction(async (tx) => {
    const locked = await tx.attendance.findUnique({ where: { id: current.id }, include: includeAttendance() });
    if (!locked || locked.status !== expected) fail(`Attendance cannot transition from ${locked?.status ?? "UNKNOWN"}.`, 409, "INVALID_ATTENDANCE_TRANSITION");
    await beforeUpdate(tx, locked, now);
    await tx.attendance.update({ where: { id: locked.id }, data: { status: next, version: { increment: 1 } } });
    await event(tx, locked, actor, { ...data, eventType }, now);
    await audit(tx, locked, actor, eventType, { status: expected }, { status: next });
    if (["CHECK_IN", "CHECK_OUT"].includes(eventType)) {
      const profile = await tx.employeeProfile.findUnique({ where: { userId: actor.userId }, select: { supervisorId: true } });
      if (profile?.supervisorId) await createNotification({ client: tx, organizationId: actor.organizationId, recipientId: profile.supervisorId, actorId: actor.userId, eventType: "ATTENDANCE_UPDATE", title: eventType === "CHECK_IN" ? "Employee checked in" : "Employee checked out", body: `An employee recorded ${eventType === "CHECK_IN" ? "a check-in" : "a check-out"}.`, resourceType: "ATTENDANCE", resourceId: locked.id, actionUrl: "/attendance", metadata: { attendanceEvent: eventType }, dedupeKey: `attendance:${locked.id}:${eventType}` });
    }
    return tx.attendance.findUnique({ where: { id: locked.id }, include: includeAttendance() });
  }));
}

export async function getCurrent(actor) {
  ensureEmployee(actor);
  const current = await currentForEmployee(actor);
  return current ? serialize(current) : null;
}

export async function listHistory(actor, filters, admin = false) {
  const where = {
    organizationId: actor.organizationId,
    ...(admin
      ? {
          ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
          ...(actor.role === "SUPERVISOR" ? { employee: { employeeProfile: { supervisorId: actor.userId } } } : {}),
        }
      : { employeeId: actor.userId }),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to ? { attendanceDate: { ...(filters.from ? { gte: utcDate(filters.from) } : {}), ...(filters.to ? { lte: utcDate(filters.to) } : {}) } } : {}),
    ...(filters.search ? { employee: { name: { contains: filters.search, mode: "insensitive" } } } : {}),
  };
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.attendance.findMany({ where, include: includeAttendance(), orderBy: [{ attendanceDate: "desc" }, { id: "desc" }], skip, take: filters.pageSize }),
    prisma.attendance.count({ where }),
  ]);
  return { items: items.map(serialize), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function syncEvents(actor, events) {
  ensureEmployee(actor);
  const results = [];
  for (const item of events) {
    const duplicate = item.clientEventId ? await prisma.attendanceEvent.findUnique({ where: { clientEventId: item.clientEventId }, include: { attendance: true } }) : null;
    if (duplicate) {
      results.push({ clientEventId: item.clientEventId, status: duplicate.processingStatus, attendanceId: duplicate.attendanceId });
      continue;
    }
    try {
      const mutation = { ...item, idempotencyKey: item.idempotencyKey ?? item.clientEventId };
      const result = item.eventType === "CHECK_IN" ? await checkIn(actor, mutation) : item.eventType === "BREAK_START" ? await startBreak(actor, mutation) : item.eventType === "BREAK_END" ? await endBreak(actor, mutation) : await checkOut(actor, mutation);
      results.push({ clientEventId: item.clientEventId, status: "PROCESSED", attendanceId: result.id });
    } catch (error) {
      results.push({ clientEventId: item.clientEventId, status: "REJECTED", code: error.code ?? "SYNC_REJECTED", message: error.message });
    }
  }
  return results;
}

export async function createCorrection(actor, attendanceId, data) {
  ensureEmployee(actor);
  const attendance = await prisma.attendance.findFirst({ where: { id: attendanceId, organizationId: actor.organizationId, employeeId: actor.userId } });
  if (!attendance) fail("Attendance not found.", 404, "ATTENDANCE_NOT_FOUND");
  const pending = await prisma.attendanceCorrectionRequest.findFirst({ where: { attendanceId, status: "PENDING" } });
  if (pending) fail("A correction request is already pending.", 409, "CORRECTION_ALREADY_PENDING");
  return prisma.$transaction(async (tx) => {
    const correction = await tx.attendanceCorrectionRequest.create({ data: { organizationId: actor.organizationId, attendanceId, employeeId: actor.userId, ...data } });
    const profile = await tx.employeeProfile.findUnique({ where: { userId: actor.userId }, select: { supervisorId: true } });
    if (profile?.supervisorId) await createNotification({ client: tx, organizationId: actor.organizationId, recipientId: profile.supervisorId, actorId: actor.userId, eventType: "ATTENDANCE_UPDATE", title: "Attendance correction requested", body: "An employee requested an attendance correction for your review.", resourceType: "ATTENDANCE", resourceId: attendanceId, actionUrl: "/attendance", metadata: { correctionId: correction.id }, dedupeKey: `attendance-correction:${correction.id}:requested` });
    return correction;
  });
}

export async function listCorrections(actor, mine = true) {
  if (mine && actor.role === "EMPLOYEE") {
    return prisma.attendanceCorrectionRequest.findMany({
      where: { organizationId: actor.organizationId, employeeId: actor.userId },
      include: { attendance: true, employee: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  ensureReviewer(actor);
  return prisma.attendanceCorrectionRequest.findMany({
    where: {
      organizationId: actor.organizationId,
      ...(mine ? { employeeId: actor.userId } : { status: "PENDING" }),
      ...(actor.role === "SUPERVISOR" && !mine ? { employee: { employeeProfile: { supervisorId: actor.userId } } } : {}),
    },
    include: { attendance: true, employee: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewCorrection(actor, correctionId, decision, reviewComment) {
  ensureReviewer(actor);
  const correction = await prisma.attendanceCorrectionRequest.findFirst({ where: { id: correctionId, organizationId: actor.organizationId }, include: { attendance: true } });
  if (!correction) fail("Correction request not found.", 404, "CORRECTION_NOT_FOUND");
  if (correction.status !== "PENDING") fail("This correction has already been reviewed.", 409, "CORRECTION_ALREADY_REVIEWED");
  if (correction.employeeId === actor.userId) fail("You cannot review your own correction.", 403, "CORRECTION_SELF_REVIEW");
  if (actor.role === "SUPERVISOR") {
    const employee = await prisma.employeeProfile.findFirst({ where: { userId: correction.employeeId, supervisorId: actor.userId } });
    if (!employee) fail("You cannot review this employee's correction.", 403, "CORRECTION_FORBIDDEN");
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceCorrectionRequest.updateMany({ where: { id: correctionId, status: "PENDING" }, data: { status: decision, reviewedById: actor.userId, reviewedAt: new Date(), reviewComment: reviewComment ?? null } });
    if (updated.count !== 1) fail("This correction has already been reviewed.", 409, "CORRECTION_ALREADY_REVIEWED");
    const attendance = decision === "APPROVED" ? await tx.attendance.update({ where: { id: correction.attendanceId }, data: { checkedInAt: correction.requestedCheckInAt ?? correction.attendance.checkedInAt, checkedOutAt: correction.requestedCheckOutAt ?? correction.attendance.checkedOutAt, version: { increment: 1 } } }) : correction.attendance;
    await tx.attendanceEvent.create({ data: { attendanceId: attendance.id, employeeId: correction.employeeId, eventType: "CORRECTION_APPLIED", serverOccurredAt: new Date(), processingStatus: "PROCESSED", metadata: { correctionId, decision } } });
    await tx.attendanceAuditLog.create({ data: { organizationId: actor.organizationId, attendanceId: attendance.id, actorId: actor.userId, action: `CORRECTION_${decision}`, beforeState: { checkedInAt: correction.attendance.checkedInAt, checkedOutAt: correction.attendance.checkedOutAt }, afterState: { checkedInAt: attendance.checkedInAt, checkedOutAt: attendance.checkedOutAt }, reason: reviewComment } });
    await createNotification({ client: tx, organizationId: actor.organizationId, recipientId: correction.employeeId, actorId: actor.userId, eventType: "ATTENDANCE_UPDATE", title: `Attendance correction ${decision.toLowerCase()}`, body: reviewComment?.trim() ? reviewComment.trim().slice(0, 500) : `Your attendance correction was ${decision.toLowerCase()}.`, resourceType: "ATTENDANCE", resourceId: attendance.id, actionUrl: "/attendance", metadata: { correctionId, decision }, dedupeKey: `attendance-correction:${correctionId}:${decision}` });
    return tx.attendanceCorrectionRequest.findUnique({ where: { id: correctionId }, include: { attendance: true } });
  });
}

export async function summary(actor) {
  ensureReviewer(actor);
  const date = utcDate();
  const employeeScope = actor.role === "SUPERVISOR" ? { role: "EMPLOYEE", employeeProfile: { supervisorId: actor.userId } } : { role: "EMPLOYEE" };
  const attendanceScope = actor.role === "SUPERVISOR" ? { employee: { employeeProfile: { supervisorId: actor.userId } } } : {};
  const [totalEmployees, checkedIn, onBreak, completed, pendingCorrections] = await prisma.$transaction([
    prisma.user.count({ where: { organizationId: actor.organizationId, status: "ACTIVE", ...employeeScope } }),
    prisma.attendance.count({ where: { organizationId: actor.organizationId, attendanceDate: date, status: { in: ["WORKING", "ON_BREAK"] }, ...attendanceScope } }),
    prisma.attendance.count({ where: { organizationId: actor.organizationId, attendanceDate: date, status: "ON_BREAK", ...attendanceScope } }),
    prisma.attendance.count({ where: { organizationId: actor.organizationId, attendanceDate: date, status: "COMPLETED", ...attendanceScope } }),
    prisma.attendanceCorrectionRequest.count({ where: { organizationId: actor.organizationId, status: "PENDING", ...(actor.role === "SUPERVISOR" ? { employee: { employeeProfile: { supervisorId: actor.userId } } } : {}) } }),
  ]);
  return { totalEmployees, checkedIn, onBreak, completed, pendingCorrections, attendanceDate: date };
}
