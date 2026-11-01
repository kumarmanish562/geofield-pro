import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [postgis] = await prisma.$queryRaw`SELECT PostGIS_Version() AS version`;

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        dependencies: {
          postgres: "up",
          postgis: "up",
          postgisVersion: postgis.version
        }
      },
      requestId: req.id
    });
  } catch (error) {
    error.status = 503;
    error.code = "SERVICE_UNAVAILABLE";
    error.publicMessage = "A required service is unavailable.";
    next(error);
  }
});

export default router;