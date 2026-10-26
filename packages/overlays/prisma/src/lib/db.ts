import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

/**
 * Prisma client + database lifecycle hooks, used by src/index.ts (startup/shutdown)
 * and the /health endpoint in src/app.ts.
 *
 * Query anywhere with: import { prisma } from "@/lib/db.js";
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

/** Opens the database connection. Called before the server starts listening. */
export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info("🐘 PostgreSQL connected (Prisma)");
}

/** Closes the database connection. Called during graceful shutdown. */
export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info("🔌 PostgreSQL disconnected");
}

/** Connection status reported by /health. */
export async function getDbStatus(): Promise<string> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  } catch {
    return "error";
  }
}
