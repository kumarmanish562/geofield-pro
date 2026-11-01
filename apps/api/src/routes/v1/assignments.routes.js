import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { assignmentCreateSchema, assignmentEmployeeSchema, assignmentListSchema, assignmentUpdateSchema } from "../../modules/assignments/assignment.schemas.js";
import { addEmployee, changeAssignmentState, createAssignment, getAssignment, listAssignments, listAuditLogs, removeEmployee, updateAssignment } from "../../modules/assignments/assignment.service.js";

const router = Router();
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function validate(res, req, parsed, message) { return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, requestId: req.id }); }

router.use(authenticate);
router.get("/", handle(async (req, res) => {
  const parsed = assignmentListSchema.safeParse(req.query);
  if (!parsed.success) return validate(res, req, parsed, "The assignment filters are invalid.");
  return res.json({ success: true, data: await listAssignments(req.auth, parsed.data), requestId: req.id });
}));
router.post("/", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => {
  const parsed = assignmentCreateSchema.safeParse(req.body);
  if (!parsed.success) return validate(res, req, parsed, "The assignment details are invalid.");
  return res.status(201).json({ success: true, data: await createAssignment(req.auth, parsed.data), requestId: req.id });
}));
router.get("/:id", handle(async (req, res) => res.json({ success: true, data: await getAssignment(req.auth, req.params.id), requestId: req.id })));
router.patch("/:id", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => {
  const parsed = assignmentUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validate(res, req, parsed, "The assignment update is invalid.");
  return res.json({ success: true, data: await updateAssignment(req.auth, req.params.id, parsed.data), requestId: req.id });
}));
router.post("/:id/employees", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => {
  const parsed = assignmentEmployeeSchema.safeParse(req.body);
  if (!parsed.success) return validate(res, req, parsed, "The assignment employee is invalid.");
  return res.status(201).json({ success: true, data: await addEmployee(req.auth, req.params.id, parsed.data.employeeId), requestId: req.id });
}));
router.delete("/:id/employees/:employeeId", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => res.json({ success: true, data: await removeEmployee(req.auth, req.params.id, req.params.employeeId), requestId: req.id })));
for (const action of ["publish", "pause", "resume", "complete", "cancel"]) {
  router.post(`/:id/${action}`, authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => res.json({ success: true, data: await changeAssignmentState(req.auth, req.params.id, action), requestId: req.id })));
}
router.get("/:id/audit-logs", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => res.json({ success: true, data: await listAuditLogs(req.auth, req.params.id), requestId: req.id })));
export default router;
