import { Router } from "express";
import { register, login, getProfile } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import { authRateLimiter } from "@/middlewares/rateLimiter.js";

export const authRouter = Router();

/**
 * Auth Routes — mounted at /api/v1/auth
 *
 * POST   /api/v1/auth/register  → Create a new account
 * POST   /api/v1/auth/login     → Log in, receive a JWT token
 * GET    /api/v1/auth/profile   → Get current user's profile (requires auth)
 */

// Public routes (with strict rate limiting to prevent brute-force)
authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);

// Protected routes
authRouter.get("/profile", authenticate, getProfile);
