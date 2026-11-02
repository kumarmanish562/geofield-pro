import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { adminAttendanceSchema, correctionReviewSchema } from "../../modules/attendance/attendance.schemas.js";
import { listCorrections, listHistory, reviewCorrection, summary } from "../../modules/attendance/attendance.service.js";

const router = Router();
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function validate(res, req, parsed) { return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "The attendance filters are invalid.", details: parsed.error.issues }, requestId: req.id }); }
router.use(authenticate, authorize("ADMIN", "SUPERVISOR"));
router.get("/", handle(async (req, res) => { const parsed = adminAttendanceSchema.safeParse(req.query); if (!parsed.success) return validate(res, req, parsed); return res.json({ success: true, data: await listHistory(req.auth, parsed.data, true), requestId: req.id }); }));
router.get("/summary", handle(async (req, res) => res.json({ success: true, data: await summary(req.auth), requestId: req.id })));
router.get("/corrections", handle(async (req, res) => res.json({ success: true, data: await listCorrections(req.auth, false), requestId: req.id })));
router.get("/corrections/:correctionId", handle(async (req, res) => {
  const correction = (await listCorrections(req.auth, false)).find((item) => item.id === req.params.correctionId);
  if (!correction) return res.status(404).json({ success: false, error: { code: "CORRECTION_NOT_FOUND", message: "Correction request not found." }, requestId: req.id });
  return res.json({ success: true, data: correction, requestId: req.id });
}));
router.post("/corrections/:correctionId/approve", handle(async (req, res) => { const parsed = correctionReviewSchema.safeParse(req.body); if (!parsed.success) return validate(res, req, parsed); return res.json({ success: true, data: await reviewCorrection(req.auth, req.params.correctionId, "APPROVED", parsed.data.reviewComment), requestId: req.id }); }));
router.post("/corrections/:correctionId/reject", handle(async (req, res) => { const parsed = correctionReviewSchema.safeParse(req.body); if (!parsed.success) return validate(res, req, parsed); return res.json({ success: true, data: await reviewCorrection(req.auth, req.params.correctionId, "REJECTED", parsed.data.reviewComment), requestId: req.id }); }));
export default router;
