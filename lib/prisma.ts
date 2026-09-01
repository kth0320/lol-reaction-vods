import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const client = new PrismaClient();
  void client
    .$queryRawUnsafe("PRAGMA journal_mode=WAL")
    .then(() => client.$queryRawUnsafe("PRAGMA busy_timeout=5000"))
    .then(() => client.$queryRawUnsafe("PRAGMA synchronous=NORMAL"))
    .catch(() => {
      // sqlite-only; ignore if the connection is not ready yet
    });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
