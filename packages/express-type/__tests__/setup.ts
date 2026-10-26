/**
 * Global test setup — runs before all test files.
 *
 * Sets minimal environment variables so Zod env validation passes in tests.
 * Tests should NOT depend on real external services (DB, Redis, etc.).
 */
import { config } from "dotenv";

// Set required env vars before any module imports (avoids Zod startup crash)
process.env.NODE_ENV = "test";
process.env.PORT = "8005";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.JWT_EXPIRES_IN = "15m";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.API_DOCS_ENABLED = "true";

// Fill in anything else (e.g. DATABASE_URL) from .env.example — never overrides the values above
config({ path: ".env.example", quiet: true });
