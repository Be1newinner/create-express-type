import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "@/lib/zod.js";

/**
 * OpenAPI registry — the single source for the API docs served at /docs.
 *
 * Feature route files register their endpoints here with `registry.registerPath()`,
 * reusing the same Zod schemas that `validate()` uses, so docs never drift from
 * the actual validation rules.
 */
export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const errorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional()
      .openapi({ description: "Present on validation errors (400)" }),
  })
);

// ─── Response Helpers ─────────────────────────────────────────────────────────

/** Documents a response wrapped in the standard `sendSuccess()` envelope */
export const successResponse = (data: z.ZodTypeAny, description: string) => ({
  description,
  content: {
    "application/json": {
      schema: z.object({ success: z.literal(true), message: z.string(), data }),
    },
  },
});

/** Documents an error response produced by the global error handler */
export const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: errorResponseSchema } },
});

/** Documents a JSON request body */
export const jsonBody = (schema: z.ZodTypeAny) => ({
  content: { "application/json": { schema } },
});

// ─── Document ─────────────────────────────────────────────────────────────────

export const buildOpenApiDocument = () =>
  new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: { title: "API Documentation", version: "1.0.0" },
    servers: [{ url: "/" }],
  });
