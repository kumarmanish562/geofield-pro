import { prisma } from "../../database/prisma.js";
import { recordAuthEvent } from "../auth/auth.audit.js";
import { AuthError } from "../auth/auth.service.js";

const roles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST"];
const quoteCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const safeCell = (value) => /^[=+\-@]/.test(String(value ?? "")) ? `'${value}` : value;

function ensureAccess(actor) {
  if (!roles.includes(actor.role)) throw new AuthError("You cannot access survey reports.", 403, "REPORT_FORBIDDEN");
}

function whereFor(actor, filters) {
  return {
    organizationId: actor.organizationId,
    ...(actor.role === "SUPERVISOR" ? { assignment: { supervisorId: actor.userId } } : {}),
    ...(filters.villageId ? { villageId: filters.villageId } : {}),
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters.assignmentId ? { assignmentId: filters.assignmentId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.reviewerId ? { reviews: { some: { reviewedBy: filters.reviewerId } } } : {}),
    ...(filters.startDate || filters.endDate ? { submittedAt: { ...(filters.startDate ? { gte: filters.startDate } : {}), ...(filters.endDate ? { lte: filters.endDate } : {}) } } : {}),
  };
}

const rowInclude = {
  employee: { select: { id: true, name: true, employeeProfile: { select: { employeeCode: true } } } },
  village: { select: { name: true, code: true } },
  assignment: { select: { name: true } },
  reviews: { orderBy: { reviewedAt: "desc" }, take: 1, include: { reviewer: { select: { name: true } } } },
};

function toRow(survey) {
  return {
    surveyId: survey.surveyNumber,
    employee: survey.employee?.name,
    employeeId: survey.employee?.employeeProfile?.employeeCode ?? survey.employeeId,
    village: survey.village?.name,
    villageCode: survey.village?.code,
    assignment: survey.assignment?.name,
    gatNumber: survey.gatNumber,
    plotNumber: survey.plotNumber,
    status: survey.status,
    submissionDate: survey.submittedAt?.toISOString() ?? "",
    reviewer: survey.reviews?.[0]?.reviewer?.name ?? "",
    reviewDate: survey.reviews?.[0]?.reviewedAt?.toISOString() ?? "",
  };
}

export async function getReportRows(actor, filters) {
  ensureAccess(actor);
  const surveys = await prisma.survey.findMany({ where: whereFor(actor, filters), include: rowInclude, orderBy: { submittedAt: "desc" }, take: 10000 });
  return surveys.map(toRow);
}

export async function getSummary(actor, filters) {
  ensureAccess(actor);
  const rows = await getReportRows(actor, filters);
  const by = (key) => Object.entries(rows.reduce((acc, row) => { acc[row[key]] = (acc[row[key]] ?? 0) + 1; return acc; }, {})).map(([name, count]) => ({ name, count }));
  return { total: rows.length, approved: rows.filter((row) => row.status === "APPROVED").length, pending: rows.filter((row) => ["SUBMITTED", "UNDER_REVIEW"].includes(row.status)).length, rejected: rows.filter((row) => row.status === "REJECTED").length, correctionRequired: rows.filter((row) => row.status === "CORRECTION_REQUIRED").length, villageWise: by("village"), employeeWise: by("employee") };
}

export function toCsv(rows) {
  const headers = ["Survey ID", "Employee", "Employee ID", "Village", "Village Code", "Assignment", "Gat Number", "Plot Number", "Survey Status", "Submission Date", "Reviewer", "Review Date"];
  return [headers.map(quoteCsv).join(","), ...rows.map((row) => [row.surveyId, row.employee, row.employeeId, row.village, row.villageCode, row.assignment, row.gatNumber, row.plotNumber, row.status, row.submissionDate, row.reviewer, row.reviewDate].map((value) => quoteCsv(safeCell(value))).join(","))].join("\r\n");
}

function xmlCell(value) {
  return `<Cell><Data ss:Type="String">${String(safeCell(value) ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")}</Data></Cell>`;
}
function worksheet(name, rows) {
  return `<Worksheet ss:Name="${name}"><Table>${rows.map((row) => `<Row>${row.map(xmlCell).join("")}</Row>`).join("")}</Table></Worksheet>`;
}
export function toExcelXml(rows, summary) {
  const header = ["Survey ID", "Employee", "Employee ID", "Village", "Village Code", "Assignment", "Gat Number", "Plot Number", "Survey Status", "Submission Date", "Reviewer", "Review Date"];
  const byStatus = (status) => rows.filter((row) => row.status === status);
  const rowValues = (row) => [row.surveyId, row.employee, row.employeeId, row.village, row.villageCode, row.assignment, row.gatNumber, row.plotNumber, row.status, row.submissionDate, row.reviewer, row.reviewDate];
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${worksheet("Survey Summary", [["Metric", "Value"], ["Total", summary.total], ["Approved", summary.approved], ["Pending", summary.pending], ["Rejected", summary.rejected], ["Correction Required", summary.correctionRequired]])}${worksheet("Approved Surveys", [header, ...byStatus("APPROVED").map(rowValues)])}${worksheet("Pending Surveys", [header, ...rows.filter((row) => ["SUBMITTED", "UNDER_REVIEW"].includes(row.status)).map(rowValues)])}${worksheet("Rejected Surveys", [header, ...byStatus("REJECTED").map(rowValues)])}${worksheet("Village-wise Report", [["Village", "Count"], ...summary.villageWise.map((row) => [row.name, row.count])])}${worksheet("Employee-wise Report", [["Employee", "Count"], ...summary.employeeWise.map((row) => [row.name, row.count])])}</Workbook>`;
}

export async function recordExport(actor, format, count) {
  await recordAuthEvent({ event: "REPORT_EXPORTED", actorUserId: actor.userId, organizationId: actor.organizationId, targetType: "SurveyReport", metadata: { format, count } });
}
