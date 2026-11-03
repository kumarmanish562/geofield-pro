import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { attachmentSyncSchema, resolveConflictSchema, surveySyncSchema, syncListSchema } from "./sync.schemas.js";
import { listConflicts, resolveConflict, syncAttachment, syncHistory, syncStatus, syncSurvey } from "./sync.service.js";

const router = Router();
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function invalid(res, req, parsed, message) { return res.status(400).json({ success: false, error: { code: "SYNC_VALIDATION_FAILED", message, details: parsed.error.issues }, requestId: req.id }); }
router.use(authenticate, authorize("EMPLOYEE"));
router.post("/surveys", handle(async (req, res) => { const parsed = surveySyncSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Offline survey payload is invalid."); return res.json({ success: true, data: await syncSurvey(req.auth, parsed.data), requestId: req.id }); }));
router.post("/attachments", handle(async (req, res) => { const parsed = attachmentSyncSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Offline attachment payload is invalid."); return res.json({ success: true, data: await syncAttachment(req.auth, parsed.data), requestId: req.id }); }));
router.get("/status", handle(async (req, res) => res.json({ success: true, data: await syncStatus(req.auth), requestId: req.id })));
router.get("/history", handle(async (req, res) => { const parsed = syncListSchema.safeParse(req.query); if (!parsed.success) return invalid(res, req, parsed, "Sync history filters are invalid."); return res.json({ success: true, data: await syncHistory(req.auth, parsed.data), requestId: req.id }); }));
router.get("/conflicts", handle(async (req, res) => res.json({ success: true, data: await listConflicts(req.auth), requestId: req.id })));
router.post("/conflicts/:eventId/resolve", handle(async (req, res) => { const parsed = resolveConflictSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "A conflict resolution strategy is required."); return res.json({ success: true, data: await resolveConflict(req.auth, req.params.eventId, parsed.data.strategy), requestId: req.id }); }));
export default router;
