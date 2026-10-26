import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Config for drizzle-kit (npm run db:generate / db:migrate / db:push / db:studio)
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
