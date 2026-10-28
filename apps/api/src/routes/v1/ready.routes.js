import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        dependencies: {
          postgres: "up"
        }
      },
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

export default router;