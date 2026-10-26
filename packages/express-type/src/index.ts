import "dotenv/config";
import { app } from "@/app.js";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import { connectDB, disconnectDB } from "@/lib/db.js";

// ─── Server Start ─────────────────────────────────────────────────────────────
await connectDB(); // top-level await (ESM) — fail fast if the database is unreachable

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`   Health check: http://localhost:${env.PORT}/health`);
  logger.info(`   API base:     http://localhost:${env.PORT}/api/v1`);
  if (env.API_DOCS_ENABLED) {
    logger.info(`   API docs:     http://localhost:${env.PORT}/docs`);
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let isShuttingDown = false;

const shutdown = (signal: string): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received — shutting down gracefully...`);
  server.close((): void => {
    void (async (): Promise<void> => {
      logger.info("✅ HTTP server closed.");
      await disconnectDB();
      process.exit(0);
    })();
  });

  // Force exit if server doesn't close within 10s
  setTimeout(() => {
    logger.error("❌ Force closing server after timeout.");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "💥 Unhandled Rejection");
  shutdown("UNHANDLED_REJECTION");
});
