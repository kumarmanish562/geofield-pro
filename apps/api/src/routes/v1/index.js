import { Router } from "express";
import healthRouter from "./health.routes.js";
import readyRouter from "./ready.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/ready", readyRouter);

export default router;