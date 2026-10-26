/**
 * Auth Domain — Types & DTOs
 *
 * 🔌 Database Integration:
 *   With Prisma:   Replace `User` with `import { User } from '@prisma/client';`
 *   With Drizzle:  Replace `User` with `typeof users.$inferSelect` from src/db/schema.ts.
 *   With Mongoose: Create a Mongoose schema/model and export it instead.
 */
import type { z } from "zod";
import type { loginBody, registerBody } from "./auth.schema.js";

// ─── Core Entity ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Always stored as a bcrypt hash — NEVER plain text
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "user" | "admin";

// ─── Data Transfer Objects (DTOs) ─────────────────────────────────────────────
// Derived from the Zod schemas, so types and validation rules can't drift apart.

/** Data required to register a new user (password is plain text — hashed in the service layer) */
export type CreateUserDto = z.infer<typeof registerBody>;

/** Data required to log in */
export type LoginDto = z.infer<typeof loginBody>;

/** User data safe to return in API responses (no password) */
export type UserResponse = Omit<User, "password">;

/** Auth response returned after successful register or login */
export type AuthResponse = {
  user: UserResponse;
  token: string;
};
