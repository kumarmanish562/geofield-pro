import { prisma } from "../../database/prisma.js";
import { env } from "../../config/env.js";
import { recordAuthEvent } from "../auth/auth.audit.js";
import { AuthError } from "../auth/auth.service.js";
import { createInvitation } from "../auth/auth.invitations.js";

function forbidden(message, code = "WORKFORCE_FORBIDDEN") {
  return new AuthError(message, 403, code);
}

function ensureAdmin(actor) {
  if (actor.role !== "ADMIN") {
    throw forbidden("Only organization administrators can manage workforce records.");
  }
}

function employeeSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    status: true,
    organizationId: true,
    createdAt: true,
    updatedAt: true,
    employeeProfile: {
      select: {
        employeeCode: true,
        jobTitle: true,
        phone: true,
        supervisor: { select: { id: true, name: true, email: true, role: true } },
      },
    },
    teamMemberships: {
      select: { team: { select: { id: true, name: true, status: true } } },
    },
  };
}

async function ensureSupervisor(organizationId, supervisorId) {
  if (!supervisorId) return null;
  const supervisor = await prisma.user.findFirst({
    where: {
      id: supervisorId,
      organizationId,
      role: { in: ["ADMIN", "SUPERVISOR"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!supervisor) {
    throw new AuthError("The supervisor is not an active user in this organization.", 400, "INVALID_SUPERVISOR");
  }
  return supervisor.id;
}

export async function listEmployees(actor, filters) {
  if (!["ADMIN", "SUPERVISOR"].includes(actor.role)) throw forbidden("You cannot view workforce records.");
  const where = {
    organizationId: actor.organizationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { employeeProfile: { employeeCode: { contains: filters.search, mode: "insensitive" } } },
      ],
    } : {}),
  };
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: employeeSelect(), orderBy: { name: "asc" }, skip, take: filters.pageSize }),
    prisma.user.count({ where }),
  ]);
  return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getEmployee(actor, userId) {
  if (!["ADMIN", "SUPERVISOR"].includes(actor.role)) throw forbidden("You cannot view workforce records.");
  const employee = await prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId }, select: employeeSelect() });
  if (!employee) throw new AuthError("Employee not found.", 404, "EMPLOYEE_NOT_FOUND");
  return employee;
}

export async function updateEmployee(actor, userId, changes, req) {
  ensureAdmin(actor);
  const existing = await prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId }, select: { id: true, role: true, status: true } });
  if (!existing) throw new AuthError("Employee not found.", 404, "EMPLOYEE_NOT_FOUND");
  if (changes.status === "DISABLED" && existing.id === actor.userId) throw new AuthError("You cannot disable your own account.", 400, "SELF_DISABLE_FORBIDDEN");
  const supervisorId = changes.supervisorId === undefined ? undefined : await ensureSupervisor(actor.organizationId, changes.supervisorId);
  const userData = {};
  if (changes.name !== undefined) userData.name = changes.name;
  if (changes.status !== undefined) userData.status = changes.status;
  const profileData = {
    ...(changes.employeeCode !== undefined ? { employeeCode: changes.employeeCode } : {}),
    ...(changes.jobTitle !== undefined ? { jobTitle: changes.jobTitle } : {}),
    ...(changes.phone !== undefined ? { phone: changes.phone } : {}),
    ...(supervisorId !== undefined ? { supervisorId } : {}),
  };
  const employee = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: existing.id }, data: userData });
    if (Object.keys(profileData).length) {
      await tx.employeeProfile.upsert({
        where: { userId: existing.id },
        create: { organizationId: actor.organizationId, userId: existing.id, ...profileData },
        update: profileData,
      });
    }
    await recordAuthEvent({ client: tx, event: "WORKFORCE_EMPLOYEE_UPDATED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "User", targetId: existing.id, req, metadata: { fields: Object.keys({ ...userData, ...profileData }) } });
    return tx.user.findUnique({ where: { id: existing.id }, select: employeeSelect() });
  });
  return employee;
}

export async function inviteEmployee(actor, data, req) {
  ensureAdmin(actor);
  if (env.NODE_ENV === "production") {
    throw new AuthError(
      "Invitation delivery is not configured. Contact the system administrator.",
      503,
      "INVITATION_DELIVERY_NOT_CONFIGURED",
    );
  }
  const result = await createInvitation({ actor, email: data.email, role: data.role });
  await recordAuthEvent({ event: "WORKFORCE_EMPLOYEE_INVITED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "OrganizationInvitation", targetId: result.invitation.id, req, metadata: { email: result.invitation.email, role: result.invitation.role } });
  return result;
}

export async function listTeams(actor, filters) {
  if (!["ADMIN", "SUPERVISOR"].includes(actor.role)) throw forbidden("You cannot view teams.");
  return prisma.team.findMany({
    where: { organizationId: actor.organizationId, ...(filters.status ? { status: filters.status } : {}) },
    orderBy: { name: "asc" },
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
      memberships: { include: { user: { select: { id: true, name: true, email: true, role: true, status: true } } } },
    },
  });
}

async function validateTeamSupervisor(organizationId, supervisorId) {
  return ensureSupervisor(organizationId, supervisorId);
}

export async function createTeam(actor, data, req) {
  ensureAdmin(actor);
  const supervisorId = await validateTeamSupervisor(actor.organizationId, data.supervisorId);
  try {
    const team = await prisma.team.create({ data: { organizationId: actor.organizationId, name: data.name, description: data.description ?? null, supervisorId }, include: { supervisor: { select: { id: true, name: true, email: true } } } });
    await recordAuthEvent({ event: "WORKFORCE_TEAM_CREATED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "Team", targetId: team.id, req, metadata: { name: team.name } });
    return team;
  } catch (error) {
    if (error.code === "P2002") throw new AuthError("A team with this name already exists.", 409, "TEAM_NAME_EXISTS");
    throw error;
  }
}

export async function updateTeam(actor, teamId, data, req) {
  ensureAdmin(actor);
  const existing = await prisma.team.findFirst({ where: { id: teamId, organizationId: actor.organizationId }, select: { id: true } });
  if (!existing) throw new AuthError("Team not found.", 404, "TEAM_NOT_FOUND");
  const supervisorId = data.supervisorId === undefined ? undefined : await validateTeamSupervisor(actor.organizationId, data.supervisorId);
  try {
    const team = await prisma.team.update({ where: { id: teamId }, data: { ...(data.name !== undefined ? { name: data.name } : {}), ...(data.description !== undefined ? { description: data.description } : {}), ...(data.status !== undefined ? { status: data.status } : {}), ...(supervisorId !== undefined ? { supervisorId } : {}) }, include: { supervisor: { select: { id: true, name: true, email: true } } } });
    await recordAuthEvent({ event: "WORKFORCE_TEAM_UPDATED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "Team", targetId: team.id, req, metadata: { fields: Object.keys(data) } });
    return team;
  } catch (error) {
    if (error.code === "P2002") throw new AuthError("A team with this name already exists.", 409, "TEAM_NAME_EXISTS");
    throw error;
  }
}

export async function addTeamMember(actor, teamId, userId, req) {
  ensureAdmin(actor);
  const [team, user] = await prisma.$transaction([
    prisma.team.findFirst({ where: { id: teamId, organizationId: actor.organizationId }, select: { id: true, status: true } }),
    prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId, role: { in: ["EMPLOYEE", "SUPERVISOR"] }, status: "ACTIVE" }, select: { id: true } }),
  ]);
  if (!team) throw new AuthError("Team not found.", 404, "TEAM_NOT_FOUND");
  if (team.status !== "ACTIVE") throw new AuthError("Archived teams cannot receive members.", 400, "TEAM_ARCHIVED");
  if (!user) throw new AuthError("Active employee not found in this organization.", 404, "EMPLOYEE_NOT_FOUND");
  try {
    const membership = await prisma.teamMembership.create({ data: { teamId, userId } });
    await recordAuthEvent({ event: "WORKFORCE_TEAM_MEMBER_ADDED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "TeamMembership", targetId: membership.id, req, metadata: { teamId, userId } });
    return membership;
  } catch (error) {
    if (error.code === "P2002") throw new AuthError("The employee is already on this team.", 409, "TEAM_MEMBER_EXISTS");
    throw error;
  }
}

export async function removeTeamMember(actor, teamId, userId, req) {
  ensureAdmin(actor);
  const membership = await prisma.teamMembership.findFirst({ where: { teamId, userId, team: { organizationId: actor.organizationId } }, select: { id: true } });
  if (!membership) throw new AuthError("Team membership not found.", 404, "TEAM_MEMBER_NOT_FOUND");
  await prisma.teamMembership.delete({ where: { id: membership.id } });
  await recordAuthEvent({ event: "WORKFORCE_TEAM_MEMBER_REMOVED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "TeamMembership", targetId: membership.id, req, metadata: { teamId, userId } });
}
