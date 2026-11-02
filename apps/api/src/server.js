import { env } from "./config/env.js";
import app from "./app.js";
import { prisma } from "./database/prisma.js";
import { attachSocketServer } from "./sockets/socket-server.js";

async function startServer() {
  await prisma.$connect();

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
  attachSocketServer(server);

  return server;
}

let server;

try {
  server = await startServer();
} catch (error) {
  console.error(
    JSON.stringify({
      level: "error",
      message: "GeoField Pro API failed to start",
      error: error.message
    })
  );
  await prisma.$disconnect();
  process.exitCode = 1;
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown || !server) {
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
    server.closeAllConnections?.();
    process.exitCode = 1;
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));