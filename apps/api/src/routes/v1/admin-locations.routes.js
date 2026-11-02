import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { locationListSchema, trackingSessionSchema } from "../../modules/locations/location.schemas.js";
import { endTrackingSession, historyForAdmin, latestForAdmin, startTrackingSession, trackingSessionsForAdmin } from "../../modules/locations/location.service.js";

const router = Router();
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function validate(res, req, parsed, message) { return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues }, requestId: req.id }); }
router.use(authenticate, authorize("ADMIN", "SUPERVISOR"));
router.get("/latest", handle(async (req, res) => res.json({ success: true, data: await latestForAdmin(req.auth), requestId: req.id })));
router.get("/history", handle(async (req, res) => { const parsed = locationListSchema.safeParse(req.query); if (!parsed.success) return validate(res, req, parsed, "The location history filters are invalid."); return res.json({ success: true, data: await historyForAdmin(req.auth, parsed.data), requestId: req.id }); }));
router.get("/sessions", handle(async (req, res) => res.json({ success: true, data: await trackingSessionsForAdmin(req.auth), requestId: req.id })));
router.post("/sessions", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => { const parsed = trackingSessionSchema.safeParse(req.body); if (!parsed.success) return validate(res, req, parsed, "The tracking session is invalid."); return res.status(201).json({ success: true, data: await startTrackingSession(req.auth, parsed.data.employeeId), requestId: req.id }); }));
router.post("/sessions/:sessionId/end", handle(async (req, res) => res.json({ success: true, data: await endTrackingSession(req.auth, req.params.sessionId), requestId: req.id })));
export default router;
