import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import { reportFilterSchema } from "./reports.schemas.js";
import { getReportRows, getSummary, recordExport, toCsv, toExcelXml } from "./reports.service.js";

const router = Router();
const handle = (handler) => async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } };
const invalid = (req, res, parsed) => res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Report filters are invalid.", details: parsed.error.issues }, requestId: req.id });

router.use(authenticate);
router.get("/surveys/summary", handle(async (req, res) => { const parsed = reportFilterSchema.safeParse(req.query); if (!parsed.success) return invalid(req, res, parsed); return res.json({ success: true, data: await getSummary(req.auth, parsed.data), requestId: req.id }); }));
router.get("/surveys", handle(async (req, res) => { const parsed = reportFilterSchema.safeParse(req.query); if (!parsed.success) return invalid(req, res, parsed); return res.json({ success: true, data: { items: await getReportRows(req.auth, parsed.data) }, requestId: req.id }); }));
router.get("/surveys/export/csv", handle(async (req, res) => { const parsed = reportFilterSchema.safeParse(req.query); if (!parsed.success) return invalid(req, res, parsed); const rows = await getReportRows(req.auth, parsed.data); await recordExport(req.auth, "csv", rows.length); res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="survey-report-${new Date().toISOString().slice(0, 10)}.csv"`); return res.send(`\uFEFF${toCsv(rows)}`); }));
router.get("/surveys/export/excel", handle(async (req, res) => { const parsed = reportFilterSchema.safeParse(req.query); if (!parsed.success) return invalid(req, res, parsed); const rows = await getReportRows(req.auth, parsed.data); const summary = await getSummary(req.auth, parsed.data); await recordExport(req.auth, "excel", rows.length); res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="survey-report-${new Date().toISOString().slice(0, 10)}.xls"`); return res.send(toExcelXml(rows, summary)); }));
export default router;
