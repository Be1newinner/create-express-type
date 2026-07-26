import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import { requestId } from "@/middlewares/requestId.js";
import { apiRouter } from "@/routes/index.js";
import { errorHandler } from "@/middlewares/errorHandler.js";
import { notFoundHandler } from "@/middlewares/notFound.js";
import { globalRateLimiter } from "@/middlewares/rateLimiter.js";
import { asyncHandler } from "@/middlewares/asyncHandler.js";
// __DB_IMPORT__

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

// ── Pre-request Middlewares ───────────────────────────────────────────────────
app.use(requestId); // Attaches X-Request-Id header to requests and responses
app.use(pinoHttp({ logger })); // HTTP request logging
app.use(compression()); // Gzip response compression
app.use(helmet()); // Secure HTTP headers
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  })
);

// ── Request Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Prevent payload flooding attacks
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    // __DB_HEALTH_CHECK__
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      // __DB_HEALTH_RESULT__
    });
  })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1", apiRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Server Start ─────────────────────────────────────────────────────────────
// __DB_CONNECT__
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`   Health check: http://localhost:${env.PORT}/health`);
  logger.info(`   API base:     http://localhost:${env.PORT}/api/v1`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal: string): void => {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close((): void => {
    void (async (): Promise<void> => {
      logger.info("✅ HTTP server closed.");
      // __DB_DISCONNECT__
      process.exit(0);
    })();
  });

  // Force exit if server doesn't close within 10s
  setTimeout(() => {
    logger.error("❌ Force closing server after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "💥 Unhandled Rejection");
  shutdown("UNHANDLED_REJECTION");
});
