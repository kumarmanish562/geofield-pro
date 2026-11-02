import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";

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
    origin(origin, callback) {
      // Native clients and server-to-server requests may omit Origin.
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-GeoField-Request",
      "Idempotency-Key",
    ],
  })
);

app.use(cookieParser());

app.use(requestIdMiddleware);
app.use(requestLogger);

app.use(express.json({ limit: "1mb" }));
app.use(env.API_PREFIX, v1Router);
app.use(
  `${env.API_PREFIX}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument)
);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
