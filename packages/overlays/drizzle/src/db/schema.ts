import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Database schema (Drizzle ORM).
 *
 * After editing, sync the database with `npm run db:push` (prototyping) or
 * `npm run db:generate && npm run db:migrate` (versioned migrations).
 *
 * Replace the User interface in src/features/auth/auth.model.ts with
 * `typeof users.$inferSelect`, then swap the in-memory store in auth.service.ts
 * for `db.select().from(users)` queries.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
