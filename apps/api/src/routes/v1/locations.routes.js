import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { locationListSchema, observationSchema } from "../../modules/locations/location.schemas.js";
import { createObservation, currentTrackingSession, listMine } from "../../modules/locations/location.service.js";

const router = Router();
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function validate(res, req, parsed, message) { return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues }, requestId: req.id }); }

router.use(authenticate);
router.post("/", authorize("EMPLOYEE"), handle(async (req, res) => {
  const parsed = observationSchema.safeParse(req.body);
  if (!parsed.success) return validate(res, req, parsed, "The location observation is invalid.");
  return res.status(201).json({ success: true, data: await createObservation(req.auth, parsed.data), requestId: req.id });
}));
router.get("/session/current", authorize("EMPLOYEE"), handle(async (req, res) => res.json({ success: true, data: await currentTrackingSession(req.auth), requestId: req.id })));
router.get("/me", authorize("EMPLOYEE"), handle(async (req, res) => {
  const parsed = locationListSchema.safeParse(req.query);
  if (!parsed.success) return validate(res, req, parsed, "The location history filters are invalid.");
  return res.json({ success: true, data: await listMine(req.auth, parsed.data), requestId: req.id });
}));

export default router;
