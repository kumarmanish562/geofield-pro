import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { analyticsFilterSchema } from "./analytics.schemas.js";
import { overview, attendanceAnalytics, assignmentAnalytics, surveyAnalytics, villageCoverage, locationAnalytics } from "./analytics.service.js";

const router = Router();
const handle = (fn) => async (req, res, next) => { try { return res.json({ success: true, data: await fn(req.auth, req.analyticsFilters), requestId: req.id }); } catch (error) { return next(error); } };
router.use(authenticate, authorize("ADMIN", "SUPERVISOR", "GIS_ANALYST"));
router.use((req, res, next) => {
  const parsed = analyticsFilterSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Analytics filters are invalid.", details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, requestId: req.id });
  req.analyticsFilters = parsed.data;
  return next();
});
router.get("/overview", handle(overview));
router.get("/attendance", handle(attendanceAnalytics));
router.get("/assignments", handle(assignmentAnalytics));
router.get("/surveys", handle(surveyAnalytics));
router.get("/village-coverage", handle(villageCoverage));
router.get("/locations", handle(locationAnalytics));
export default router;
