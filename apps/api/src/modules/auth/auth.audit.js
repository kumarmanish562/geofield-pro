import { prisma } from "../../database/prisma.js";

export async function recordAuthEvent({
  event,
  actorUserId,
  organizationId,
  req,
  targetType,
  targetId,
  metadata,
  client = prisma,
}) {
  await client.auditLog.create({
    data: {
      event,
      actorUserId: actorUserId ?? null,
      organizationId: organizationId ?? null,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      ipAddress: typeof req?.ip === "string" ? req.ip.slice(0, 45) : null,
      userAgent:
        typeof req?.get?.("user-agent") === "string"
          ? req.get("user-agent").slice(0, 512)
          : null,
      metadata: metadata ?? undefined,
    },
  });
}
