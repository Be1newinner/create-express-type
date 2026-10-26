import { type Request, type Response } from "express";
import { asyncHandler } from "@/middlewares/asyncHandler.js";
import { AppError } from "@/middlewares/errorHandler.js";
import { sendSuccess } from "@/utils/response.js";
import type { CreateUserDto, LoginDto } from "./auth.model.js";
import * as authService from "./auth.service.js";

// Request bodies are already validated by `validate()` in auth.route.ts.

/**
 * POST /api/v1/auth/register
 * Creates a new user account and returns a JWT token.
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto: CreateUserDto = req.body;
  const result = await authService.registerUser(dto);
  sendSuccess(res, result, "Account created successfully", 201);
});

/**
 * POST /api/v1/auth/login
 * Validates credentials and returns a JWT token.
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto: LoginDto = req.body;
  const result = await authService.loginUser(dto);
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
