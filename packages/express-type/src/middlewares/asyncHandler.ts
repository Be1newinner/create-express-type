import { type Request, type Response, type NextFunction, type RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async route handler so that any thrown errors are forwarded to
 * Express's next() function — and ultimately to the global error handler.
 *
 * Without this wrapper, a thrown error inside an async route would cause
 * the request to hang forever (Express does not catch async throws natively
 * prior to Express 5).
 *
 * @example
 *   router.get("/users", asyncHandler(async (req, res) => {
 *     const users = await userService.getAll(); // throws → goes to errorHandler
 *     res.json(users);
 *   }));
 */
export const asyncHandler = (fn: AsyncRouteHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
