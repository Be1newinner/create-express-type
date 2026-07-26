import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.js";
import { AppError } from "@/middlewares/errorHandler.js";
import type { AuthResponse, CreateUserDto, LoginDto, User, UserResponse } from "./auth.model.js";

// ─── In-Memory Store (Replace with your Database) ────────────────────────────
//
// 🔌 Prisma example:
//   import { prisma } from "@/lib/prisma.js";
//   const user = await prisma.user.findUnique({ where: { email } });
//
// 🔌 Mongoose example:
//   import { UserModel } from "./auth.model.js";
//   const user = await UserModel.findOne({ email });
//
const users: User[] = [];

const SALT_ROUNDS = 12; // bcrypt cost factor (higher = slower but more secure)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strips the password before sending user data to the client */
const sanitizeUser = (user: User): UserResponse => {
  const { password: _password, ...rest } = user;
  return rest;
};

/** Signs a JWT with the user's id and role */
const signToken = (user: User): string =>
  jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Registers a new user.
 * Throws AppError(409) if the email is already taken.
 */
export const registerUser = async (dto: CreateUserDto): Promise<AuthResponse> => {
  // 🔌 Replace with: const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  const existing = users.find((u) => u.email === dto.email);
  if (existing) throw new AppError("An account with this email already exists", 409);

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const newUser: User = {
    id: crypto.randomUUID(),
    name: dto.name,
    email: dto.email.toLowerCase().trim(),
    password: hashedPassword,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 🔌 Replace with: const created = await prisma.user.create({ data: newUser });
  users.push(newUser);

  return { user: sanitizeUser(newUser), token: signToken(newUser) };
};

/**
 * Authenticates a user by email/password.
 * Throws AppError(401) with a deliberately vague message to prevent user enumeration.
 */
export const loginUser = async (dto: LoginDto): Promise<AuthResponse> => {
  // 🔌 Replace with: const user = await prisma.user.findUnique({ where: { email: dto.email } });
  const user = users.find((u) => u.email === dto.email.toLowerCase().trim());

  // Use the same error for "user not found" AND "wrong password" to prevent user enumeration
  if (!user) throw new AppError("Invalid email or password", 401);

  const isPasswordValid = await bcrypt.compare(dto.password, user.password);
  if (!isPasswordValid) throw new AppError("Invalid email or password", 401);

  return { user: sanitizeUser(user), token: signToken(user) };
};

/**
 * Fetches a user by their ID.
 * Throws AppError(404) if not found.
 */
export const getUserById = async (id: string): Promise<UserResponse> => {
  // 🔌 Replace with: const user = await prisma.user.findUnique({ where: { id } });
  const user = users.find((u) => u.id === id);
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
};
