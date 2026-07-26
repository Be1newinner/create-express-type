import { type Request, type Response } from "express";

/**
 * 404 Not Found handler.
 *
 * Catches any request that didn't match a defined route and returns
 * a consistent JSON response (instead of Express's default HTML error page).
 *
 * IMPORTANT: Register this AFTER all routes in index.ts, but BEFORE the
 * global error handler.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};
