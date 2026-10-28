import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "geofield-api"
    },
    requestId: req.id
  });
});

export default router;