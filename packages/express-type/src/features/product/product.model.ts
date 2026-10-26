/**
 * Product Domain — Types & DTOs
 *
 * 🔌 Database Integration:
 *   With Prisma:   Replace `Product` with `import { Product } from '@prisma/client';`
 *   With Drizzle:  Replace `Product` with `typeof products.$inferSelect`.
 *   With Mongoose: Create a Mongoose schema/model and export it.
 */
import type { z } from "zod";
import type { createProductBody, updateProductBody } from "./product.schema.js";

// ─── Core Entity ──────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Store in smallest currency unit (e.g. cents) for real apps
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Data Transfer Objects ────────────────────────────────────────────────────
// Derived from the Zod schemas, so types and validation rules can't drift apart.

/** Data required to create a new product */
export type CreateProductDto = z.infer<typeof createProductBody>;

/** Data allowed when updating a product (all fields optional) */
export type UpdateProductDto = z.infer<typeof updateProductBody>;
