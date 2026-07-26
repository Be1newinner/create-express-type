/**
 * Auth Domain — Types & DTOs
 *
 * 🔌 Database Integration:
 *   With Prisma:   Replace `User` with `import { User } from '@prisma/client';`
 *   With Mongoose: Create a Mongoose schema/model and export it instead.
 */

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

/** Data required to register a new user */
export type CreateUserDto = {
  name: string;
  email: string;
  password: string; // Plain text — hashed in the service layer
};

/** Data required to log in */
export type LoginDto = {
  email: string;
  password: string;
};

/** User data safe to return in API responses (no password) */
export type UserResponse = Omit<User, "password">;

/** Auth response returned after successful register or login */
export type AuthResponse = {
  user: UserResponse;
  token: string;
};
