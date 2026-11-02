import { Server } from "socket.io";
import { prisma } from "../database/prisma.js";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import { setLocationBroadcaster } from "../modules/locations/location.socket.js";

export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const claims = await verifyAccessToken(token);
      const session = await prisma.authSession.findFirst({
        where: { id: claims.sid, userId: claims.sub, organizationId: claims.org, revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE", organization: { status: "ACTIVE" } } },
        select: { userId: true, organizationId: true, user: { select: { role: true } } },
      });
      if (!session) return next(new Error("Session invalid"));
      socket.auth = { userId: session.userId, organizationId: session.organizationId, role: session.user.role };
      return next();
    } catch {
      return next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    if (["ADMIN", "SUPERVISOR"].includes(socket.auth.role)) {
      socket.join(`organization:${socket.auth.organizationId}:locations`);
    }
  });

  setLocationBroadcaster((observation) => {
    io.to(`organization:${observation.organizationId}:locations`).emit("location:observation.created.v1", observation);
  });

  return io;
}
