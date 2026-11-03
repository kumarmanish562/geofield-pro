import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { reviewCommentSchema, reviewListSchema, requiredCommentSchema } from "./survey-reviews.schemas.js";
import { approveSurvey, getHistory, getReview, listReviews, rejectSurvey, requestCorrection } from "./survey-reviews.service.js";

const router = Router();
const roles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST"];
const handle = (handler) => async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } };
const invalid = (req, res, parsed, message) => res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues }, requestId: req.id });

router.use(authenticate);
router.get("/:id/history", handle(async (req, res) => res.json({ success: true, data: await getHistory(req.auth, req.params.id), requestId: req.id })));
router.use(authorize(...roles));
router.get("/", handle(async (req, res) => { const parsed = reviewListSchema.safeParse(req.query); if (!parsed.success) return invalid(req, res, parsed, "Review filters are invalid."); return res.json({ success: true, data: await listReviews(req.auth, parsed.data), requestId: req.id }); }));
router.get("/:id", handle(async (req, res) => res.json({ success: true, data: await getReview(req.auth, req.params.id), requestId: req.id })));
router.post("/:id/approve", handle(async (req, res) => { const parsed = reviewCommentSchema.safeParse(req.body); if (!parsed.success) return invalid(req, res, parsed, "Review comments are invalid."); return res.json({ success: true, data: await approveSurvey(req.auth, req.params.id, parsed.data.comments), requestId: req.id }); }));
router.post("/:id/reject", handle(async (req, res) => { const parsed = requiredCommentSchema.safeParse(req.body); if (!parsed.success) return invalid(req, res, parsed, "A rejection reason is required."); return res.json({ success: true, data: await rejectSurvey(req.auth, req.params.id, parsed.data.comments), requestId: req.id }); }));
router.post("/:id/request-correction", handle(async (req, res) => { const parsed = requiredCommentSchema.safeParse(req.body); if (!parsed.success) return invalid(req, res, parsed, "Correction instructions are required."); return res.json({ success: true, data: await requestCorrection(req.auth, req.params.id, parsed.data.comments), requestId: req.id }); }));
export default router;
