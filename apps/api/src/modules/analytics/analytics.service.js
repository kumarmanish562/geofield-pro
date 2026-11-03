import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";

const roles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST"];
const reviewPending = ["SUBMITTED", "UNDER_REVIEW"];
function access(actor) {
  if (!roles.includes(actor.role)) throw new AuthError("You cannot access organization analytics.", 403, "ANALYTICS_FORBIDDEN");
}
function userScope(actor, teamId) {
  return { organizationId: actor.organizationId, role: "EMPLOYEE", status: "ACTIVE",
    ...(actor.role === "SUPERVISOR" ? { OR: [
      { employeeProfile: { supervisorId: actor.userId } },
      { assignmentMemberships: { some: { assignment: { supervisorId: actor.userId } } } },
    ] } : {}),
    ...(teamId ? { teamMemberships: { some: { teamId, team: { organizationId: actor.organizationId } } } } : {}),
  };
}
function scope(actor, teamId) {
  return { organizationId: actor.organizationId,
    ...(actor.role === "SUPERVISOR" ? { supervisorId: actor.userId } : {}),
    ...(teamId ? { employees: { some: { employee: { teamMemberships: { some: { teamId } } } } } } : {}),
  };
}
function surveyScope(actor, filters) {
  return { organizationId: actor.organizationId,
    ...(actor.role === "SUPERVISOR" ? { assignment: { supervisorId: actor.userId } } : {}),
    ...(filters.teamId ? { employee: { teamMemberships: { some: { teamId: filters.teamId, team: { organizationId: actor.organizationId } } } } } : {}),
    ...(filters.startDate || filters.endDate ? { submittedAt: { not: null, ...(filters.startDate ? { gte: filters.startDate } : {}), ...(filters.endDate ? { lte: filters.endDate } : {}) } } : {}),
  };
}
function dateFilter(filters, field) {
  return filters.startDate || filters.endDate ? { [field]: { ...(filters.startDate ? { gte: filters.startDate } : {}), ...(filters.endDate ? { lte: filters.endDate } : {}) } } : {};
}
const paging = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });
const pagination = (page, pageSize, total) => ({ page, pageSize, total, totalPages: Math.ceil(total / pageSize) });

export async function overview(actor, filters) {
  access(actor);
  const employees = userScope(actor, filters.teamId);
  const assignments = scope(actor, filters.teamId);
  const surveys = surveyScope(actor, filters);
  const [totalEmployees, activeAttendance, activeAssignments, villages, completedSurveys, awaitingReview] = await Promise.all([
    prisma.user.count({ where: employees }),
    prisma.attendance.count({ where: { organizationId: actor.organizationId, status: "WORKING", checkedInAt: { not: null }, employee: employees } }),
    prisma.assignment.count({ where: { ...assignments, status: { in: ["PUBLISHED", "PAUSED"] } } }),
    prisma.village.count({ where: { organizationId: actor.organizationId, status: "ACTIVE" } }),
    prisma.survey.count({ where: { ...surveys, status: "APPROVED" } }),
    prisma.survey.count({ where: { ...surveys, status: { in: reviewPending } } }),
  ]);
  return { totalEmployees, activeAttendance, activeAssignments, villages, completedSurveys, awaitingReview,
    definitions: { totalEmployees: "Active EMPLOYEE accounts in scope.", activeAttendance: "Employees with a WORKING attendance record and a recorded check-in; excludes break and completed records.", activeAssignments: "Assignments in PUBLISHED or PAUSED state.", villages: "Active villages in the organization; village count is not team scoped.", completedSurveys: "Surveys with APPROVED status, filtered by submission date when supplied.", awaitingReview: "Surveys in SUBMITTED or UNDER_REVIEW status, filtered by submission date when supplied." } };
}

export async function attendanceAnalytics(actor, filters) {
  access(actor);
  const where = { organizationId: actor.organizationId, employee: userScope(actor, filters.teamId), ...dateFilter(filters, "attendanceDate") };
  const rows = await prisma.attendance.groupBy({ by: ["attendanceDate", "status"], where, _count: { _all: true }, orderBy: { attendanceDate: "asc" } });
  const grouped = new Map();
  for (const row of rows) { const key = row.attendanceDate.toISOString().slice(0, 10); const item = grouped.get(key) ?? { date: key, working: 0, onBreak: 0, completed: 0 }; item[{ WORKING: "working", ON_BREAK: "onBreak", COMPLETED: "completed" }[row.status]] = row._count._all; grouped.set(key, item); }
  const recordsWhere = { ...where, status: "COMPLETED", checkedInAt: { not: null }, checkedOutAt: { not: null } };
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({ where, select: { id: true, attendanceDate: true, status: true, checkedInAt: true, checkedOutAt: true, totalBreakSeconds: true, employee: { select: { id: true, name: true } } }, orderBy: [{ attendanceDate: "desc" }, { id: "asc" }], ...paging(filters) }),
    prisma.attendance.count({ where }),
  ]);
  const durationRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count,
      ROUND(AVG(GREATEST(0, EXTRACT(EPOCH FROM (a.checked_out_at - a.checked_in_at)) / 60 - a.total_break_seconds / 60)))::int AS average_minutes
    FROM attendances a
    JOIN users u ON u.id = a.employee_id
    LEFT JOIN employee_profiles ep ON ep.user_id = u.id
    WHERE a.organization_id = ${actor.organizationId}::uuid
      AND a.status = 'COMPLETED' AND a.checked_in_at IS NOT NULL AND a.checked_out_at IS NOT NULL
      AND (${filters.startDate ?? null}::timestamp IS NULL OR a.attendance_date >= ${filters.startDate ?? null}::timestamp)
      AND (${filters.endDate ?? null}::timestamp IS NULL OR a.attendance_date <= ${filters.endDate ?? null}::timestamp)
      AND (${filters.teamId ?? null}::uuid IS NULL OR EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id AND tm.team_id = ${filters.teamId ?? null}::uuid))
      AND (${actor.role !== "SUPERVISOR"} OR ep.supervisor_id = ${actor.userId}::uuid OR EXISTS (
        SELECT 1 FROM assignment_employees ae JOIN assignments ass ON ass.id = ae.assignment_id
        WHERE ae.employee_id = u.id AND ass.supervisor_id = ${actor.userId}::uuid
      ))
  `;
  const duration = durationRows[0] ?? { count: 0, average_minutes: null };
  return { trend: [...grouped.values()], workSessionDuration: { completedSessions: duration.count, averageMinutes: duration.average_minutes, basis: "Elapsed time between recorded check-in and check-out minus recorded break seconds; completed sessions only." }, items: items.map((r) => ({ ...r, durationMinutes: r.checkedInAt && r.checkedOutAt ? Math.max(0, Math.round((r.checkedOutAt - r.checkedInAt) / 60000 - r.totalBreakSeconds / 60)) : null })), pagination: pagination(filters.page, filters.pageSize, total), definitions: { trend: "Attendance records by local database date and current status; this is a record count, not unique employees.", incomplete: "Open sessions have null duration and are excluded from the duration average." } };
}

export async function assignmentAnalytics(actor, filters) {
  access(actor);
  const where = { ...scope(actor, filters.teamId), ...dateFilter(filters, "startDate") };
  const [items, total] = await Promise.all([
    prisma.assignment.findMany({ where, select: { id: true, name: true, status: true, startDate: true, dueDate: true, targets: true, _count: { select: { employees: true, surveys: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CORRECTION_REQUIRED"] } } } } } }, orderBy: [{ dueDate: "asc" }, { id: "asc" }], ...paging(filters) }),
    prisma.assignment.count({ where }),
  ]);
  return { items: items.map((a) => { const target = Object.values(a.targets ?? {}).reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0); return { ...a, targetSurveys: target || null, submittedSurveys: a._count.surveys, completionPercent: target > 0 ? Math.min(100, Math.round((a._count.surveys / target) * 100)) : null, completionBasis: target > 0 ? "Measured non-draft surveys divided by configured numeric targets." : "No numeric target configured; completion percentage unavailable." }; }), pagination: pagination(filters.page, filters.pageSize, total), definitions: { completion: "Measured non-draft persisted survey count versus configured numeric assignment targets. Draft surveys are excluded. Missing targets are null; counts are not estimates." } };
}

export async function surveyAnalytics(actor, filters) {
  access(actor);
  const where = surveyScope(actor, filters);
  const submissions = { ...where, status: { not: "DRAFT" } };
  const [statusCounts, villageGroups, items, total] = await Promise.all([
    prisma.survey.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.survey.groupBy({ by: ["villageId"], where: submissions, _count: { _all: true }, orderBy: { _count: { villageId: "desc" } }, take: 100 }),
    prisma.survey.findMany({ where, select: { id: true, surveyNumber: true, status: true, submittedAt: true, village: { select: { id: true, name: true } }, employee: { select: { id: true, name: true } } }, orderBy: [{ submittedAt: "desc" }, { id: "asc" }], ...paging(filters) }),
    prisma.survey.count({ where }),
  ]);
  const villageIds = villageGroups.map((row) => row.villageId);
  const villages = villageIds.length ? await prisma.village.findMany({ where: { organizationId: actor.organizationId, id: { in: villageIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(villages.map((v) => [v.id, v.name]));
  const counts = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));
  const decided = (counts.APPROVED ?? 0) + (counts.REJECTED ?? 0);
  return { byStatus: counts, byVillage: villageGroups.map((row) => ({ villageId: row.villageId, village: names.get(row.villageId) ?? "Unknown village", submissions: row._count._all })), approval: { approved: counts.APPROVED ?? 0, rejected: counts.REJECTED ?? 0, decided, ratePercent: decided ? Math.round(((counts.APPROVED ?? 0) / decided) * 100) : null, definition: "Approved / (approved + rejected); excludes drafts, pending review, and correction-required surveys." }, items, pagination: pagination(filters.page, filters.pageSize, total), definitions: { submitted: "Status totals include drafts; by-village submissions exclude drafts and use current persisted status. The top 100 villages by submission count are returned.", coverage: "A village is represented when at least one survey matches filters; no population denominator exists, so this is activity coverage, not resident coverage." } };
}

export async function villageCoverage(actor, filters) {
  access(actor);
  const where = { organizationId: actor.organizationId, status: "ACTIVE" };
  if (actor.role === "SUPERVISOR") where.surveys = { some: { assignment: { supervisorId: actor.userId } } };
  if (filters.teamId) {
    where.surveys = {
      some: {
        assignment: {
          ...(actor.role === "SUPERVISOR" ? { supervisorId: actor.userId } : {}),
          employees: {
            some: {
              employee: { teamMemberships: { some: { teamId: filters.teamId } } },
            },
          },
        },
      },
    };
  }
  const [items, total] = await Promise.all([
    prisma.village.findMany({ where, select: { id: true, name: true, code: true, state: true, district: true, taluka: true }, orderBy: [{ name: "asc" }, { id: "asc" }], ...paging(filters) }),
    prisma.village.count({ where }),
  ]);
  const villageIds = items.map((v) => v.id);
  const counts = villageIds.length ? await prisma.survey.groupBy({ by: ["villageId", "status"], where: { ...surveyScope(actor, filters), villageId: { in: villageIds } }, _count: { _all: true } }) : [];
  const countsByVillage = new Map();
  for (const row of counts) { const item = countsByVillage.get(row.villageId) ?? { total: 0, approved: 0 }; item.total += row._count._all; if (row.status === "APPROVED") item.approved += row._count._all; countsByVillage.set(row.villageId, item); }
  return { items: items.map((v) => { const counts = countsByVillage.get(v.id) ?? { total: 0, approved: 0 }; return { ...v, surveyCount: counts.total, approvedCount: counts.approved, hasActivity: counts.total > 0 }; }), pagination: pagination(filters.page, filters.pageSize, total), definition: "Active in-scope villages with persisted survey counts. No geographic population denominator is available; zero activity means no matching surveys, not confirmed lack of field coverage." };
}

export async function locationAnalytics(actor, filters) {
  access(actor);
  const teamFilter = filters.teamId ? { employee: { teamMemberships: { some: { teamId: filters.teamId, team: { organizationId: actor.organizationId } } } } } : {};
  const supervisorFilter = actor.role === "SUPERVISOR" ? { OR: [
    { employee: { employeeProfile: { supervisorId: actor.userId } } },
    { employee: { assignmentMemberships: { some: { assignment: { supervisorId: actor.userId } } } } },
  ] } : {};
  const where = { organizationId: actor.organizationId, ...teamFilter, ...supervisorFilter, ...dateFilter(filters, "capturedAt") };
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const [total, missingAccuracy, poorAccuracy] = await Promise.all([
    prisma.locationObservation.count({ where }),
    prisma.locationObservation.count({ where: { ...where, accuracyMeters: null } }),
    prisma.locationObservation.count({ where: { ...where, accuracyMeters: { gt: 100 } } }),
  ]);
  // SQL compares observation timestamps and selects the latest record per employee in the database.
  const [delayed, staleCount, latest] = await Promise.all([prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM location_observations lo
    JOIN users u ON u.id = lo.employee_id
    LEFT JOIN employee_profiles ep ON ep.user_id = u.id
    WHERE lo.organization_id = ${actor.organizationId}::uuid
      AND lo.captured_at < lo.received_at - INTERVAL '5 minutes'
      AND (${filters.startDate ?? null}::timestamp IS NULL OR lo.captured_at >= ${filters.startDate ?? null}::timestamp)
      AND (${filters.endDate ?? null}::timestamp IS NULL OR lo.captured_at <= ${filters.endDate ?? null}::timestamp)
      AND (${filters.teamId ?? null}::uuid IS NULL OR EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id AND tm.team_id = ${filters.teamId ?? null}::uuid))
      AND (${actor.role !== "SUPERVISOR"} OR ep.supervisor_id = ${actor.userId}::uuid OR EXISTS (
        SELECT 1 FROM assignment_employees ae JOIN assignments ass ON ass.id = ae.assignment_id
        WHERE ae.employee_id = u.id AND ass.supervisor_id = ${actor.userId}::uuid
      ))
  `, prisma.$queryRaw`
    WITH latest AS (
      SELECT DISTINCT ON (lo.employee_id) lo.employee_id, lo.received_at, u.name
      FROM location_observations lo JOIN users u ON u.id = lo.employee_id
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE lo.organization_id = ${actor.organizationId}::uuid
        AND (${filters.teamId ?? null}::uuid IS NULL OR EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id AND tm.team_id = ${filters.teamId ?? null}::uuid))
        AND (${actor.role !== "SUPERVISOR"} OR ep.supervisor_id = ${actor.userId}::uuid OR EXISTS (
          SELECT 1 FROM assignment_employees ae JOIN assignments ass ON ass.id = ae.assignment_id
          WHERE ae.employee_id = u.id AND ass.supervisor_id = ${actor.userId}::uuid
        ))
      ORDER BY lo.employee_id, lo.received_at DESC
    ) SELECT COUNT(*)::int AS count FROM latest WHERE received_at < ${cutoff}
  `, prisma.$queryRaw`
    WITH latest AS (
      SELECT DISTINCT ON (lo.employee_id) lo.employee_id, lo.received_at, u.name
      FROM location_observations lo JOIN users u ON u.id = lo.employee_id
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE lo.organization_id = ${actor.organizationId}::uuid
        AND (${filters.teamId ?? null}::uuid IS NULL OR EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id AND tm.team_id = ${filters.teamId ?? null}::uuid))
        AND (${actor.role !== "SUPERVISOR"} OR ep.supervisor_id = ${actor.userId}::uuid OR EXISTS (
          SELECT 1 FROM assignment_employees ae JOIN assignments ass ON ass.id = ae.assignment_id
          WHERE ae.employee_id = u.id AND ass.supervisor_id = ${actor.userId}::uuid
        ))
      ORDER BY lo.employee_id, lo.received_at DESC
    ) SELECT employee_id AS "employeeId", received_at AS "receivedAt", name FROM latest
      WHERE received_at < ${cutoff} ORDER BY received_at ASC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}
  `]);
  return { observations: total, quality: { missingAccuracy, poorAccuracyOver100m: poorAccuracy, definition: "Missing accuracy is null accuracyMeters; poor accuracy exceeds 100 meters. Threshold is a reporting convention, not device validation." }, delayedOfflineUploads: delayed[0]?.count ?? 0, staleEmployees: latest, stalePagination: pagination(filters.page, filters.pageSize, staleCount[0]?.count ?? 0), staleCutoffMinutes: 5, definitions: { delayedOfflineUploads: "Observations received more than five minutes after capturedAt; this indicates delayed submission and is not a device offline duration.", staleEmployees: "Employees whose latest received observation is older than five minutes at query time. No recent observation is not proof the device is offline.", filters: "Date filters apply to quality and delayed-upload observations; stale employee status uses latest observation regardless of date filters." } };
}
