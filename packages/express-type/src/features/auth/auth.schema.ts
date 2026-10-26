import { z } from "@/lib/zod.js";
import { registry } from "@/docs/openapi.js";

/**
 * Auth request/response schemas.
 *
 * Used by `validate()` in auth.route.ts for runtime validation AND
 * registered with the OpenAPI registry for the docs at /docs.
 */

export const registerBody = registry.register(
  "RegisterInput",
  z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters")
      .openapi({ example: "Ada Lovelace" }),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .openapi({ example: "ada@example.com" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters")
      .openapi({ example: "correct-horse-battery" }),
  })
);

export const loginBody = registry.register(
  "LoginInput",
  z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .openapi({ example: "ada@example.com" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .openapi({ example: "correct-horse-battery" }),
  })
);

export const userResponse = registry.register(
  "User",
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["user", "admin"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

export const authResponse = registry.register(
  "AuthResponse",
  z.object({ user: userResponse, token: z.string() })
);
