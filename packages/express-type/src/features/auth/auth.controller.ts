import { type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "@/middlewares/asyncHandler.js";
import { AppError } from "@/middlewares/errorHandler.js";
import { sendSuccess } from "@/utils/response.js";
import * as authService from "./auth.service.js";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

const loginSchema = z.object({
  email: z.string({ required_error: "Email is required" }).email("Invalid email address"),
  password: z.string({ required_error: "Password is required" }).min(1),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Creates a new user account and returns a JWT token.
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 400);
  }
  const result = await authService.registerUser(parsed.data);
  sendSuccess(res, result, "Account created successfully", 201);
});

/**
 * POST /api/v1/auth/login
 * Validates credentials and returns a JWT token.
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 400);
  }
  const result = await authService.loginUser(parsed.data);
  sendSuccess(res, result, "Logged in successfully");
});

/**
 * GET /api/v1/auth/profile
 * Returns the authenticated user's profile.
 * Requires a valid Bearer token (protected by `authenticate` middleware).
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new AppError("Not authenticated", 401);
  const user = await authService.getUserById(req.user.id);
  sendSuccess(res, user, "Profile retrieved successfully");
});
