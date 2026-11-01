import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { assignmentListSchema } from "../../modules/assignments/assignment.schemas.js";
import { getAssignment, listAssignments } from "../../modules/assignments/assignment.service.js";

const router = Router();
router.use(authenticate, authorize("EMPLOYEE"));
router.get("/", async (req, res, next) => {
  try {
    const parsed = assignmentListSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "The assignment filters are invalid." }, requestId: req.id });
    return res.json({ success: true, data: await listAssignments(req.auth, parsed.data), requestId: req.id });
  } catch (error) { return next(error); }
});
router.get("/:id", async (req, res, next) => {
  try { return res.json({ success: true, data: await getAssignment(req.auth, req.params.id), requestId: req.id }); } catch (error) { return next(error); }
});
export default router;
