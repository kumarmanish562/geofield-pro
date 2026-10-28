import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";

import v1Router from "./routes/v1/index.js";
import openApiDocument from "./openapi.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: false
  })
);

app.use(requestIdMiddleware);
app.use(requestLogger);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "geofield-api"
    },
    requestId: req.id
  });
});

app.get("/api/ready", async (req, res, next) => {
  try {
    const { prisma } = await import("./database/prisma.js");

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

app.use("/api/v1", v1Router);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;