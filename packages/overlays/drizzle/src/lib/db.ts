import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import * as schema from "@/db/schema.js";

/**
 * Drizzle client + database lifecycle hooks, used by src/index.ts (startup/shutdown)
 * and the /health endpoint in src/app.ts.
 *
 * Query anywhere with: import { db } from "@/lib/db.js";
 */
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema, logger: env.NODE_ENV === "development" });

/** Verifies the database is reachable. Called before the server starts listening. */
export async function connectDB(): Promise<void> {
  const client = await pool.connect();
  client.release();
  logger.info("🐘 PostgreSQL connected (Drizzle)");
}

/** Closes the connection pool. Called during graceful shutdown. */
export async function disconnectDB(): Promise<void> {
  await pool.end();
  logger.info("🔌 PostgreSQL disconnected");
}

/** Connection status reported by /health. */
export async function getDbStatus(): Promise<string> {
  try {
    await pool.query("SELECT 1");
    return "connected";
  } catch {
    return "error";
  }
}
