import { z } from "@/lib/zod.js";
import { registry } from "@/docs/openapi.js";

/**
 * Product request/response schemas.
 *
 * Used by `validate()` in product.route.ts for runtime validation AND
 * registered with the OpenAPI registry for the docs at /docs.
 */

const productFields = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be at most 100 characters")
    .openapi({ example: "TypeScript Handbook" }),
  description: z
    .string({ required_error: "Description is required" })
    .min(1, "Description cannot be empty")
    .openapi({ example: "The official TypeScript handbook." }),
  price: z
    .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
    .positive("Price must be a positive number")
    .multipleOf(0.01, "Price can have at most 2 decimal places")
    .openapi({ example: 29.99 }),
  stock: z
    .number({ required_error: "Stock is required", invalid_type_error: "Stock must be a number" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .openapi({ example: 100 }),
});

export const productIdParams = z.object({
  id: z.string().min(1, "Product ID is required").openapi({ example: "1" }),
});

export const createProductBody = registry.register("CreateProductInput", productFields);

export const updateProductBody = registry.register("UpdateProductInput", productFields.partial());

export const productResponse = registry.register(
  "Product",
  productFields.extend({
    id: z.string().openapi({ example: "1" }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);
