import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import type { z } from "zod";
import { ValidationError, type ValidationIssue } from "@/middlewares/errorHandler.js";

type RequestSchemas = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
};

/**
 * Validates `req.params`, `req.query` and `req.body` against Zod schemas.
 *
 * On success, the parsed values (with defaults, trims and coercions applied)
 * replace the originals. On failure, responds 400 with every issue found:
 *
 *   { "success": false, "message": "Validation failed",
 *     "errors": [{ "path": "body.email", "message": "Invalid email address" }] }
 *
 * @example
 *   router.post("/", validate({ body: createProductBody }), createProduct);
 */
export const validate = (schemas: RequestSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const issues: ValidationIssue[] = [];

    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({ path: [key, ...issue.path].join("."), message: issue.message });
        }
      } else if (key === "query") {
        // Express 5 exposes req.query as a getter, so it must be redefined rather than assigned
        Object.defineProperty(req, "query", {
          value: result.data,
          writable: true,
          enumerable: true,
        });
      } else {
        req[key] = result.data;
      }
    }

    if (issues.length > 0) return next(new ValidationError(issues));
    next();
  };
};
