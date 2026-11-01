import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { employeeListSchema, employeeUpdateSchema, invitationCreateSchema, membershipSchema, teamCreateSchema, teamListSchema, teamUpdateSchema } from "../../modules/workforce/workforce.schemas.js";
import { addTeamMember, createTeam, getEmployee, inviteEmployee, listEmployees, listTeams, removeTeamMember, updateEmployee, updateTeam } from "../../modules/workforce/workforce.service.js";

const router = Router();

function handle(handler) {
  return async (req, res, next) => {
    try { return await handler(req, res); } catch (error) { return next(error); }
  };
}

function validationError(res, req, parsed, message) {
  return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, requestId: req.id });
}

router.use(authenticate);
router.get("/employees", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => {
  const parsed = employeeListSchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, req, parsed, "The employee filters are invalid.");
  return res.json({ success: true, data: await listEmployees(req.auth, parsed.data), requestId: req.id });
}));
router.post("/employees/invitations", authorize("ADMIN"), handle(async (req, res) => {
  const parsed = invitationCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, req, parsed, "The invitation details are invalid.");
  const data = await inviteEmployee(req.auth, parsed.data, req);
  return res.status(201).json({ success: true, data, requestId: req.id });
}));
router.get("/employees/:userId", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => {
  return res.json({ success: true, data: await getEmployee(req.auth, req.params.userId), requestId: req.id });
}));
router.patch("/employees/:userId", authorize("ADMIN"), handle(async (req, res) => {
  const parsed = employeeUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, req, parsed, "The employee update is invalid.");
  return res.json({ success: true, data: await updateEmployee(req.auth, req.params.userId, parsed.data, req), requestId: req.id });
}));
router.get("/teams", authorize("ADMIN", "SUPERVISOR"), handle(async (req, res) => {
  const parsed = teamListSchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, req, parsed, "The team filters are invalid.");
  return res.json({ success: true, data: await listTeams(req.auth, parsed.data), requestId: req.id });
}));
router.post("/teams", authorize("ADMIN"), handle(async (req, res) => {
  const parsed = teamCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, req, parsed, "The team details are invalid.");
  return res.status(201).json({ success: true, data: await createTeam(req.auth, parsed.data, req), requestId: req.id });
}));
router.patch("/teams/:teamId", authorize("ADMIN"), handle(async (req, res) => {
  const parsed = teamUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, req, parsed, "The team update is invalid.");
  return res.json({ success: true, data: await updateTeam(req.auth, req.params.teamId, parsed.data, req), requestId: req.id });
}));
router.post("/teams/:teamId/members", authorize("ADMIN"), handle(async (req, res) => {
  const parsed = membershipSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, req, parsed, "The team membership is invalid.");
  return res.status(201).json({ success: true, data: await addTeamMember(req.auth, req.params.teamId, parsed.data.userId, req), requestId: req.id });
}));
router.delete("/teams/:teamId/members/:userId", authorize("ADMIN"), handle(async (req, res) => {
  await removeTeamMember(req.auth, req.params.teamId, req.params.userId, req);
  return res.json({ success: true, data: { removed: true }, requestId: req.id });
}));

export default router;
