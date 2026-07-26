/**
 * Product Domain — Types & DTOs
 *
 * 🔌 Database Integration:
 *   With Prisma:   Replace `Product` with `import { Product } from '@prisma/client';`
 *   With Mongoose: Create a Mongoose schema/model and export it.
 */

// ─── Core Entity ──────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;   // Store in smallest currency unit (e.g. cents) for real apps
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Data Transfer Objects ────────────────────────────────────────────────────

/** Data required to create a new product */
export type CreateProductDto = Omit<Product, "id" | "createdAt" | "updatedAt">;

/** Data allowed when updating a product (all fields optional) */
export type UpdateProductDto = Partial<CreateProductDto>;
