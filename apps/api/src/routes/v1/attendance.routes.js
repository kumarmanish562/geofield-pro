import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import {
  adminAttendanceSchema,
  attendanceHistorySchema,
  attendanceMutationSchema,
  correctionCreateSchema,
  correctionReviewSchema,
  syncSchema,
} from "../../modules/attendance/attendance.schemas.js";
import {
  checkIn,
  checkOut,
  createCorrection,
  endBreak,
  getCurrent,
  listCorrections,
  listHistory,
  reviewCorrection,
  startBreak,
  summary,
  syncEvents,
} from "../../modules/attendance/attendance.service.js";

const router = Router();

function handle(handler) {
  return async (req, res, next) => {
    try { return await handler(req, res); } catch (error) { return next(error); }
  };
}

function validate(res, req, parsed, message) {
  return res.status(400).json({
    success: false,
    error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) },
    requestId: req.id,
  });
}

function body(schema, message, handler) {
  return handle(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return validate(res, req, parsed, message);
    return handler(req, res, parsed.data);
  });
}

router.use(authenticate);
router.post("/check-in", body(attendanceMutationSchema, "The check-in request is invalid.", async (req, res, data) => res.status(201).json({ success: true, data: await checkIn(req.auth, data), requestId: req.id })));
router.post("/break/start", body(attendanceMutationSchema, "The break start request is invalid.", async (req, res, data) => res.json({ success: true, data: await startBreak(req.auth, data), requestId: req.id })));
router.post("/break/end", body(attendanceMutationSchema, "The break end request is invalid.", async (req, res, data) => res.json({ success: true, data: await endBreak(req.auth, data), requestId: req.id })));
router.post("/check-out", body(attendanceMutationSchema, "The check-out request is invalid.", async (req, res, data) => res.json({ success: true, data: await checkOut(req.auth, data), requestId: req.id })));
router.get("/current", handle(async (req, res) => res.json({ success: true, data: await getCurrent(req.auth), requestId: req.id })));
router.get("/history", handle(async (req, res) => {
  const parsed = attendanceHistorySchema.safeParse(req.query);
  if (!parsed.success) return validate(res, req, parsed, "The attendance filters are invalid.");
  return res.json({ success: true, data: await listHistory(req.auth, parsed.data), requestId: req.id });
}));
router.post("/sync", body(syncSchema, "The attendance sync request is invalid.", async (req, res, data) => res.json({ success: true, data: { results: await syncEvents(req.auth, data.events) }, requestId: req.id })));
router.post("/:attendanceId/corrections", body(correctionCreateSchema, "The correction request is invalid.", async (req, res, data) => res.status(201).json({ success: true, data: await createCorrection(req.auth, req.params.attendanceId, data), requestId: req.id })));
router.get("/corrections/mine", authorize("EMPLOYEE"), handle(async (req, res) => res.json({ success: true, data: await listCorrections(req.auth, true), requestId: req.id })));
router.get("/corrections/:correctionId", authorize("EMPLOYEE", "SUPERVISOR", "ADMIN"), handle(async (req, res) => res.json({ success: true, data: (await listCorrections(req.auth, req.auth.role === "EMPLOYEE")).find((item) => item.id === req.params.correctionId) ?? null, requestId: req.id })));

export default router;
