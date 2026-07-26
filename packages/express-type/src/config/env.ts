import { z } from "zod";

/**
 * Environment variable schema with Zod validation.
 *
 * All required env vars are validated at startup. If any are missing or invalid,
 * the server exits immediately with a clear error message (fail-fast pattern).
 *
 * To add a new env var:
 *   1. Add it to `envSchema` below
 *   2. Add it to `.env.example`
 *   3. Use it via `env.MY_VAR` throughout the app
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8005),

  // Security — JWT
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Security — CORS (comma-separated list of allowed origins)
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => val.split(",").map((o) => o.trim())),

  // ── Add your own vars below ──────────────────────────────────────────────
  // DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  // REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
  // SMTP_HOST: z.string().optional(),
  // SMTP_PORT: z.coerce.number().optional(),
});

// Parse & validate at module load time — crashes loudly if anything is wrong
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n❌ Invalid or missing environment variables:\n");
  const errors = parsed.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([field, messages]) => {
    console.error(`  ${field}: ${messages?.join(", ")}`);
  });
  console.error("\nCheck your .env file and compare with .env.example\n");
  process.exit(1);
}

export const env = parsed.data;

/** TypeScript type derived from the validated env schema */
export type Env = typeof env;
