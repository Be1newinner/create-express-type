import { type Request, type Response, type NextFunction } from "express";

// ─── AppError ─────────────────────────────────────────────────────────────────

/**
 * Custom operational error class.
 *
 * Use this to throw expected, user-facing errors (e.g. "User not found", "Invalid password").
 * These are handled gracefully and returned as structured JSON responses.
 *
 * For programmer errors (bugs), just throw a plain Error — those are caught too,
 * but returned as a generic 500 message in production.
 *
 * @example
 *   throw new AppError("Email already in use", 409);
 *   throw new AppError("Forbidden", 403);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Express global error-handling middleware.
 *
 * IMPORTANT: Must be registered LAST in index.ts (after all routes and 404 handler).
 * The 4-parameter signature is what tells Express this is an error handler.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV === "development";

  // Operational errors: expected, user-facing (validation, not found, unauthorized, etc.)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // Programmer errors / unhandled exceptions
  // Do NOT expose internals in production
  console.error("💥 Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: isDev ? err.message : "Internal Server Error",
    ...(isDev && { stack: err.stack }),
  });
};
