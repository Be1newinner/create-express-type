import { type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "@/middlewares/asyncHandler.js";
import { AppError } from "@/middlewares/errorHandler.js";
import { sendSuccess } from "@/utils/response.js";
import * as productService from "./product.service.js";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .min(1, "Name cannot be empty")
    .max(100, "Name must be at most 100 characters")
    .trim(),
  description: z
    .string({ required_error: "Description is required" })
    .min(1, "Description cannot be empty"),
  price: z
    .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
    .positive("Price must be a positive number")
    .multipleOf(0.01, "Price can have at most 2 decimal places"),
  stock: z
    .number({ required_error: "Stock is required", invalid_type_error: "Stock must be a number" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
});

const updateProductSchema = createProductSchema.partial();

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/products
 * Returns all products (public).
 */
export const getAllProducts = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const products = await productService.getAllProducts();
  sendSuccess(res, products, "Products retrieved successfully");
});

/**
 * GET /api/v1/products/:id
 * Returns a single product by ID (public).
 */
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const product = await productService.getProductById(String(req.params.id));
  sendSuccess(res, product, "Product retrieved successfully");
});

/**
 * POST /api/v1/products
 * Creates a new product (admin only).
 */
export const createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 400);
  }
  const product = await productService.createProduct(parsed.data);
  sendSuccess(res, product, "Product created successfully", 201);
});

/**
 * PATCH /api/v1/products/:id
 * Partially updates a product (admin only).
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 400);
  }
  const product = await productService.updateProduct(String(req.params.id), parsed.data);
  sendSuccess(res, product, "Product updated successfully");
});

/**
 * DELETE /api/v1/products/:id
 * Deletes a product (admin only).
 */
export const deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await productService.deleteProduct(String(req.params.id));
  sendSuccess(res, null, "Product deleted successfully");
});
