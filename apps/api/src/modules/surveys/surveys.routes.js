import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { attachmentSchema, reviewSchema, submissionSchema, surveyCreateSchema, surveyListSchema, surveyUpdateSchema } from "./surveys.schemas.js";
import { createSurvey, deleteSurvey, getSurvey, getSurveyStats, listReviewQueue, listSurveys, reviewSurvey, submitSurvey, updateSurvey } from "./surveys.service.js";
import { completeUpload, createUpload, deleteAttachment, listAttachments } from "../../services/storage/s3.js";

const router = Router();
const reviewRoles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST"];
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function invalid(res, req, parsed, message) { return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues }, requestId: req.id }); }

router.use(authenticate);
router.get("/", handle(async (req, res) => { const parsed = surveyListSchema.safeParse(req.query); if (!parsed.success) return invalid(res, req, parsed, "Survey filters are invalid."); return res.json({ success: true, data: await listSurveys(req.auth, parsed.data), requestId: req.id }); }));
router.post("/", authorize("EMPLOYEE"), handle(async (req, res) => { const parsed = surveyCreateSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Survey details are invalid."); return res.status(201).json({ success: true, data: await createSurvey(req.auth, parsed.data), requestId: req.id }); }));
router.get("/stats", authorize(...reviewRoles), handle(async (req, res) => res.json({ success: true, data: await getSurveyStats(req.auth), requestId: req.id })));
router.get("/review-queue", authorize(...reviewRoles), handle(async (req, res) => { const parsed = surveyListSchema.safeParse(req.query); if (!parsed.success) return invalid(res, req, parsed, "Survey filters are invalid."); return res.json({ success: true, data: await listReviewQueue(req.auth, parsed.data), requestId: req.id }); }));
router.get("/:id", handle(async (req, res) => res.json({ success: true, data: await getSurvey(req.auth, req.params.id), requestId: req.id })));
router.patch("/:id", authorize("EMPLOYEE"), handle(async (req, res) => { const parsed = surveyUpdateSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Survey details are invalid."); return res.json({ success: true, data: await updateSurvey(req.auth, req.params.id, parsed.data), requestId: req.id }); }));
router.delete("/:id", authorize("EMPLOYEE"), handle(async (req, res) => { await deleteSurvey(req.auth, req.params.id); return res.status(204).send(); }));
router.post("/:id/submit", authorize("EMPLOYEE"), handle(async (req, res) => { const parsed = submissionSchema.safeParse({ idempotencyKey: req.get("Idempotency-Key") ?? req.body?.idempotencyKey }); if (!parsed.success) return invalid(res, req, parsed, "A valid Idempotency-Key header is required."); return res.json({ success: true, data: await submitSurvey(req.auth, req.params.id, parsed.data.idempotencyKey), requestId: req.id }); }));
router.patch("/:id/review", authorize(...reviewRoles), handle(async (req, res) => { const parsed = reviewSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Review details are invalid."); return res.json({ success: true, data: await reviewSurvey(req.auth, req.params.id, parsed.data), requestId: req.id }); }));
router.post("/:id/attachments/presign", handle(async (req, res) => { const parsed = attachmentSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Attachment metadata is invalid."); return res.json({ success: true, data: await createUpload(req.auth, req.params.id, parsed.data), requestId: req.id }); }));
router.post("/:id/attachments/:attachmentId/complete", handle(async (req, res) => res.json({ success: true, data: await completeUpload(req.auth, req.params.id, req.params.attachmentId), requestId: req.id })));
router.get("/:id/attachments", handle(async (req, res) => res.json({ success: true, data: await listAttachments(req.auth, req.params.id), requestId: req.id })));
router.delete("/:id/attachments/:attachmentId", handle(async (req, res) => { await deleteAttachment(req.auth, req.params.id, req.params.attachmentId); return res.status(204).send(); }));
export default router;
