import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";

const managerRoles = ["ADMIN", "SUPERVISOR"];
const lifecycle = {
  publish: { from: ["DRAFT"], to: "PUBLISHED", action: "ASSIGNMENT_PUBLISHED" },
  pause: { from: ["PUBLISHED"], to: "PAUSED", action: "ASSIGNMENT_PAUSED" },
  resume: { from: ["PAUSED"], to: "PUBLISHED", action: "ASSIGNMENT_PUBLISHED" },
  complete: { from: ["PUBLISHED", "PAUSED"], to: "COMPLETED", action: "ASSIGNMENT_COMPLETED" },
  cancel: { from: ["DRAFT", "PUBLISHED", "PAUSED"], to: "CANCELLED", action: "ASSIGNMENT_CANCELLED" },
};

function fail(message, status, code) { throw new AuthError(message, status, code); }
function canManage(actor, assignment) {
  return actor.role === "ADMIN" || (actor.role === "SUPERVISOR" && assignment.supervisorId === actor.userId);
}
function ensureManager(actor) {
  if (!managerRoles.includes(actor.role)) fail("You cannot manage assignments.", 403, "ASSIGNMENT_FORBIDDEN");
}
function assignmentInclude() {
  return {
    supervisor: { select: { id: true, name: true, email: true } },
    employees: { select: { id: true, assignedAt: true, employee: { select: { id: true, name: true, email: true, role: true, status: true } } } },
  };
}
async function ensureUsers(organizationId, ids, allowedRoles = ["EMPLOYEE", "SUPERVISOR"]) {
  if (!ids.length) return;
  const count = await prisma.user.count({ where: { id: { in: ids }, organizationId, role: { in: allowedRoles }, status: "ACTIVE" } });
  if (count !== new Set(ids).size) fail("One or more selected employees are not active members of this organization.", 400, "INVALID_ASSIGNMENT_EMPLOYEE");
}
async function ensureSupervisor(organizationId, id) {
  const supervisor = await prisma.user.findFirst({ where: { id, organizationId, role: { in: ["ADMIN", "SUPERVISOR"] }, status: "ACTIVE" }, select: { id: true } });
  if (!supervisor) fail("The supervisor is not an active organization user.", 400, "INVALID_ASSIGNMENT_SUPERVISOR");
  return supervisor.id;
}
async function audit(tx, assignment, actor, action, previousValues, newValues) {
  await tx.assignmentAuditLog.create({ data: { assignmentId: assignment.id, organizationId: assignment.organizationId, actorUserId: actor.userId, action, previousValues, newValues } });
}
async function getManagedAssignment(actor, id) {
  const assignment = await prisma.assignment.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!assignment) fail("Assignment not found.", 404, "ASSIGNMENT_NOT_FOUND");
  if (!canManage(actor, assignment)) fail("You cannot manage this assignment.", 403, "ASSIGNMENT_FORBIDDEN");
  return assignment;
}

export async function createAssignment(actor, data) {
  ensureManager(actor);
  if (actor.role === "SUPERVISOR" && data.supervisorId && data.supervisorId !== actor.userId) fail("Supervisors may only create assignments they manage.", 403, "ASSIGNMENT_FORBIDDEN");
  const supervisorId = await ensureSupervisor(actor.organizationId, data.supervisorId ?? actor.userId);
  await ensureUsers(actor.organizationId, data.employeeIds);
  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.assignment.create({ data: { organizationId: actor.organizationId, name: data.name, description: data.description ?? null, supervisorId, workArea: data.workArea ?? null, startDate: data.startDate, dueDate: data.dueDate, surveyRequirements: data.surveyRequirements, targets: data.targets, createdById: actor.userId, updatedById: actor.userId, employees: { create: data.employeeIds.map((employeeId) => ({ employeeId, assignedById: actor.userId })) } }, include: assignmentInclude() });
    await audit(tx, created, actor, "ASSIGNMENT_CREATED", null, { name: created.name, status: created.status, employeeCount: data.employeeIds.length });
    return created;
  });
  return assignment;
}

export async function listAssignments(actor, filters) {
  if (!["ADMIN", "SUPERVISOR", "EMPLOYEE"].includes(actor.role)) fail("You cannot view assignments.", 403, "ASSIGNMENT_FORBIDDEN");
  const where = { organizationId: actor.organizationId, ...(actor.role === "EMPLOYEE" ? { status: { in: ["PUBLISHED", "PAUSED"] }, employees: { some: { employeeId: actor.userId } } } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}) };
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.assignment.findMany({ where, include: assignmentInclude(), orderBy: [{ dueDate: "asc" }, { id: "asc" }], skip, take: filters.pageSize }),
    prisma.assignment.count({ where }),
  ]);
  return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getAssignment(actor, id) {
  if (!["ADMIN", "SUPERVISOR", "EMPLOYEE"].includes(actor.role)) fail("You cannot view assignments.", 403, "ASSIGNMENT_FORBIDDEN");
  const assignment = await prisma.assignment.findFirst({ where: { id, organizationId: actor.organizationId, ...(actor.role === "EMPLOYEE" ? { status: { in: ["PUBLISHED", "PAUSED"] }, employees: { some: { employeeId: actor.userId } } } : {}) }, include: assignmentInclude() });
  if (!assignment) fail("Assignment not found.", 404, "ASSIGNMENT_NOT_FOUND");
  return assignment;
}

export async function updateAssignment(actor, id, data) {
  const existing = await getManagedAssignment(actor, id);
  if (["COMPLETED", "CANCELLED"].includes(existing.status)) fail("Terminal assignments cannot be changed.", 409, "ASSIGNMENT_TERMINAL");
  if (data.supervisorId !== undefined) {
    if (data.supervisorId === null) fail("An assignment must have a supervisor.", 400, "INVALID_ASSIGNMENT_SUPERVISOR");
    data.supervisorId = await ensureSupervisor(actor.organizationId, data.supervisorId);
  }
  if (actor.role === "SUPERVISOR" && data.supervisorId && data.supervisorId !== actor.userId) fail("Supervisors may not transfer assignment ownership.", 403, "ASSIGNMENT_FORBIDDEN");
  if (data.startDate && data.dueDate && data.dueDate < data.startDate) fail("Due date cannot be earlier than start date.", 400, "INVALID_ASSIGNMENT_DATES");
  if (data.startDate && !data.dueDate && data.startDate > existing.dueDate) fail("Due date cannot be earlier than start date.", 400, "INVALID_ASSIGNMENT_DATES");
  if (data.dueDate && !data.startDate && data.dueDate < existing.startDate) fail("Due date cannot be earlier than start date.", 400, "INVALID_ASSIGNMENT_DATES");
  const update = { ...data, updatedById: actor.userId };
  const assignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({ where: { id }, data: update, include: assignmentInclude() });
    await audit(tx, updated, actor, "ASSIGNMENT_UPDATED", { status: existing.status }, { fields: Object.keys(data) });
    return updated;
  });
  return assignment;
}

export async function changeAssignmentState(actor, id, action) {
  const existing = await getManagedAssignment(actor, id);
  const transition = lifecycle[action];
  if (!transition.from.includes(existing.status)) fail(`Cannot ${action} an assignment in ${existing.status} state.`, 409, "INVALID_ASSIGNMENT_TRANSITION");
  if (action === "publish" && (await prisma.assignmentEmployee.count({ where: { assignmentId: id } })) === 0) fail("An assignment must have at least one employee before publishing.", 400, "ASSIGNMENT_REQUIRES_EMPLOYEES");
  const assignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({ where: { id }, data: { status: transition.to, publishedAt: action === "publish" || action === "resume" ? new Date() : undefined, updatedById: actor.userId }, include: assignmentInclude() });
    await audit(tx, updated, actor, transition.action, { status: existing.status }, { status: updated.status });
    return updated;
  });
  return assignment;
}

export async function addEmployee(actor, id, employeeId) {
  const assignment = await getManagedAssignment(actor, id);
  if (["COMPLETED", "CANCELLED"].includes(assignment.status)) fail("Terminal assignments cannot be changed.", 409, "ASSIGNMENT_TERMINAL");
  await ensureUsers(actor.organizationId, [employeeId]);
  try {
    return await prisma.$transaction(async (tx) => {
      const membership = await tx.assignmentEmployee.create({ data: { assignmentId: id, employeeId, assignedById: actor.userId }, include: { employee: { select: { id: true, name: true, email: true } } } });
      await audit(tx, assignment, actor, "EMPLOYEE_ASSIGNED", null, { employeeId });
      return membership;
    });
  } catch (error) {
    if (error.code === "P2002") fail("This employee is already assigned.", 409, "ASSIGNMENT_EMPLOYEE_EXISTS");
    throw error;
  }
}

export async function removeEmployee(actor, id, employeeId) {
  const assignment = await getManagedAssignment(actor, id);
  if (["COMPLETED", "CANCELLED"].includes(assignment.status)) fail("Terminal assignments cannot be changed.", 409, "ASSIGNMENT_TERMINAL");
  const deleted = await prisma.assignmentEmployee.deleteMany({ where: { assignmentId: id, employeeId } });
  if (!deleted.count) fail("Assignment employee not found.", 404, "ASSIGNMENT_EMPLOYEE_NOT_FOUND");
  await prisma.assignmentAuditLog.create({ data: { assignmentId: id, organizationId: actor.organizationId, actorUserId: actor.userId, action: "EMPLOYEE_REMOVED", newValues: { employeeId } } });
  return { removed: true };
}

export async function listAuditLogs(actor, id) {
  const assignment = await getManagedAssignment(actor, id);
  return prisma.assignmentAuditLog.findMany({ where: { assignmentId: assignment.id, organizationId: actor.organizationId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, previousValues: true, newValues: true, createdAt: true, actor: { select: { id: true, name: true } } } });
}
