import { Router } from "express";

import healthRouter from "./health.routes.js";
import readyRouter from "./ready.routes.js";
import authRouter from "./auth.routes.js";
import workforceRouter from "./workforce.routes.js";
import assignmentsRouter from "./assignments.routes.js";
import myAssignmentsRouter from "./my-assignments.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/ready", readyRouter);
router.use("/auth", authRouter);
router.use("/workforce", workforceRouter);
router.use("/assignments", assignmentsRouter);
router.use("/me/assignments", myAssignmentsRouter);

export default router;