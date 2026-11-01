import argon2 from "argon2";

import { env } from "../src/config/env.js";
import { prisma } from "../src/database/prisma.js";

if (env.NODE_ENV === "production") {
  throw new Error("The development seed cannot run in production.");
}

if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
  throw new Error(
    "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to run the seed."
  );
}

const passwordHash = await argon2.hash(env.SEED_ADMIN_PASSWORD, {
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
});

try {
  const organization =
    (await prisma.organization.findFirst({
      where: { name: "GeoField Development" },
      select: { id: true },
    })) ??
    (await prisma.organization.create({
      data: { name: "GeoField Development" },
      select: { id: true },
    }));

  const user = await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL },
    update: {
      name: "Development Administrator",
      organizationId: organization.id,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Development Administrator",
      email: env.SEED_ADMIN_EMAIL,
      organizationId: organization.id,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      organizationId: true,
    },
  });

  console.info(
    JSON.stringify({
      message: "Development seed completed",
      organizationId: organization.id,
      userId: user.id,
      email: user.email,
    })
  );
} finally {
  await prisma.$disconnect();
}
