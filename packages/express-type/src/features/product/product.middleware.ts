import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "@/middlewares/errorHandler.js";

/**
 * Validates that a route param `id` is non-empty.
 *
 * Once you switch to a database with UUID primary keys, extend this to
 * validate the UUID format:
 *
 * @example
 *   const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 *   if (!UUID_REGEX.test(req.params.id)) { ... }
 */
export const validateProductId = (req: Request, _res: Response, next: NextFunction): void => {
  const id = String(req.params.id);
  if (!id || id.trim() === "") {
    return next(new AppError("Product ID is required", 400));
  }
  next();
};
