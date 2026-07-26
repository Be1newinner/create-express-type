import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Middleware that attaches a unique X-Request-Id UUID header to incoming requests
 * and forwards it in outgoing HTTP responses for distributed tracing.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const reqId = (req.headers["x-request-id"] as string) || randomUUID();
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
};
