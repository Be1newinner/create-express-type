import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "@/config/env.js";
import { apiRouter } from "@/routes/index.js";
import { errorHandler } from "@/middlewares/errorHandler.js";
import { notFoundHandler } from "@/middlewares/notFound.js";
import { globalRateLimiter } from "@/middlewares/rateLimiter.js";

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet()); // Sets secure HTTP headers (XSS, HSTS, no-sniff, etc.)
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
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1", apiRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
// Must come after all routes
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must be the LAST middleware (4 params signals Express it's an error handler)
app.use(errorHandler);

// ─── Server Start ─────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  console.log(`   Health check: http://localhost:${env.PORT}/health`);
  console.log(`   API base:     http://localhost:${env.PORT}/api/v1`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal: string): void => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log("✅ HTTP server closed.");
    // Add database disconnection here (e.g. await prisma.$disconnect())
    process.exit(0);
  });

  // Force exit if server doesn't close within 10s
  setTimeout(() => {
    console.error("❌ Force closing server after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  shutdown("UNHANDLED_REJECTION");
});
