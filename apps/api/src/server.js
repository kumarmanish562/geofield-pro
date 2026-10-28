import { env } from "./config/env.js";
import app from "./app.js";
import { prisma } from "./database/prisma.js";

const server = app.listen(env.PORT, env.HOST, () => {
  console.info(
    JSON.stringify({
      level: "info",
      message: "GeoField Pro API started",
      host: env.HOST,
      port: env.PORT,
      environment: env.NODE_ENV
    })
  );
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.info(
    JSON.stringify({
      level: "info",
      message: "Graceful shutdown started",
      signal
    })
  );

  server.close(async () => {
    try {
      await prisma.$disconnect();
      process.exitCode = 0;
    } catch {
      process.exitCode = 1;
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));