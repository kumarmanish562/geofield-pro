import { Router } from "express";

import healthRouter from "./health.routes.js";
import readyRouter from "./ready.routes.js";
import authRouter from "./auth.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/ready", readyRouter);
router.use("/auth", authRouter);

export default router;