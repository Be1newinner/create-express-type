import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.js";
import { AppError } from "@/middlewares/errorHandler.js";
import type { UserRole } from "./auth.model.js";

// ─── JWT Payload Type ─────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Extend Express Request ───────────────────────────────────────────────────
// This allows `req.user` to be accessed in any authenticated route handler.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Verifies the Bearer JWT token from the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 *
 * Usage: `router.get("/profile", authenticate, controller)`
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required. Provide a Bearer token.", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError("Your session has expired. Please log in again.", 401));
    }
    next(new AppError("Invalid token. Please log in again.", 401));
  }
};

/**
 * Role-based authorization middleware.
 * Must be used AFTER `authenticate`.
 *
 * Usage: `router.delete("/admin", authenticate, authorize("admin"), controller)`
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403)
      );
    }
    next();
  };
};
