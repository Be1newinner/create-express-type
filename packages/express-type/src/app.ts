import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { z } from "@/lib/zod.js";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import { getDbStatus } from "@/lib/db.js";
import { buildOpenApiDocument, registry } from "@/docs/openapi.js";
import { requestId } from "@/middlewares/requestId.js";
import { apiRouter } from "@/routes/index.js";
import { errorHandler } from "@/middlewares/errorHandler.js";
import { notFoundHandler } from "@/middlewares/notFound.js";
import { globalRateLimiter } from "@/middlewares/rateLimiter.js";
import { asyncHandler } from "@/middlewares/asyncHandler.js";

/**
 * The Express application, without a listening server.
 *
 * Kept separate from src/index.ts so tests can import it and drive it with Supertest.
 */
export const app = express();

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
    const db = await getDbStatus();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      ...(db && { db }),
    });
  })
);

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "Server is up",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("ok"),
            timestamp: z.string().datetime(),
            uptime: z.number(),
            environment: z.string(),
            db: z.string().optional(),
          }),
        },
      },
    },
  },
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1", apiRouter);

// ── API Docs (Swagger UI at /docs, raw spec at /docs/openapi.json) ────────────
if (env.API_DOCS_ENABLED) {
  const openApiDocument = buildOpenApiDocument();
  app.get("/docs/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);
