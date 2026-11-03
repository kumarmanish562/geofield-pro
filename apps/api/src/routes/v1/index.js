import { Router } from "express";

import healthRouter from "./health.routes.js";
import readyRouter from "./ready.routes.js";
import authRouter from "./auth.routes.js";
import workforceRouter from "./workforce.routes.js";
import assignmentsRouter from "./assignments.routes.js";
import myAssignmentsRouter from "./my-assignments.routes.js";
import attendanceRouter from "./attendance.routes.js";
import adminAttendanceRouter from "./admin-attendance.routes.js";
import locationsRouter from "./locations.routes.js";
import adminLocationsRouter from "./admin-locations.routes.js";
import villagesRouter from "./villages.routes.js";
import surveysRouter from "../../modules/surveys/surveys.routes.js";
import syncRouter from "../../modules/sync/sync.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/ready", readyRouter);
router.use("/auth", authRouter);
router.use("/workforce", workforceRouter);
router.use("/assignments", assignmentsRouter);
router.use("/me/assignments", myAssignmentsRouter);
router.use("/attendance", attendanceRouter);
router.use("/admin/attendance", adminAttendanceRouter);
router.use("/locations", locationsRouter);
router.use("/admin/locations", adminLocationsRouter);
router.use("/villages", villagesRouter);
router.use("/surveys", surveysRouter);
router.use("/admin/surveys", surveysRouter);
router.use("/sync", syncRouter);

export default router;