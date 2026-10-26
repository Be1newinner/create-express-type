import mongoose from "mongoose";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

/**
 * MongoDB (Mongoose) lifecycle hooks, used by src/index.ts (startup/shutdown)
 * and the /health endpoint in src/app.ts.
 *
 * Define models with mongoose.model() in each feature's *.model.ts.
 */

/** Opens the MongoDB connection. Called before the server starts listening. */
export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 });
  logger.info("🍃 MongoDB connected");
}

/** Closes the MongoDB connection. Called during graceful shutdown. */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info("🍃 MongoDB disconnected");
}

const CONNECTION_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/** Connection status reported by /health. */
export async function getDbStatus(): Promise<string> {
  return CONNECTION_STATES[mongoose.connection.readyState] ?? "unknown";
}
