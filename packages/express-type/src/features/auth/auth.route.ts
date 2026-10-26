import { Router } from "express";
import { register, login, getProfile } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import { authResponse, loginBody, registerBody, userResponse } from "./auth.schema.js";
import { authRateLimiter } from "@/middlewares/rateLimiter.js";
import { validate } from "@/middlewares/validate.js";
import { bearerAuth, errorResponse, jsonBody, registry, successResponse } from "@/docs/openapi.js";

export const authRouter = Router();

/**
 * Auth Routes — mounted at /api/v1/auth
 *
 * POST   /api/v1/auth/register  → Create a new account
 * POST   /api/v1/auth/login     → Log in, receive a JWT token
 * GET    /api/v1/auth/profile   → Get current user's profile (requires auth)
 */

// Public routes (with strict rate limiting to prevent brute-force)
authRouter.post("/register", authRateLimiter, validate({ body: registerBody }), register);
authRouter.post("/login", authRateLimiter, validate({ body: loginBody }), login);

// Protected routes
authRouter.get("/profile", authenticate, getProfile);

// ── OpenAPI Docs ──────────────────────────────────────────────────────────────
const tags = ["Auth"];

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/register",
  tags,
  summary: "Register a new account",
  request: { body: jsonBody(registerBody) },
  responses: {
    201: successResponse(authResponse, "Account created"),
    400: errorResponse("Validation failed"),
    409: errorResponse("Email already registered"),
    429: errorResponse("Too many attempts"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  tags,
  summary: "Log in and receive a JWT",
  request: { body: jsonBody(loginBody) },
  responses: {
    200: successResponse(authResponse, "Logged in"),
    400: errorResponse("Validation failed"),
    401: errorResponse("Invalid email or password"),
    429: errorResponse("Too many attempts"),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/auth/profile",
  tags,
  summary: "Get the current user's profile",
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: successResponse(userResponse, "Profile retrieved"),
    401: errorResponse("Not authenticated"),
  },
});
