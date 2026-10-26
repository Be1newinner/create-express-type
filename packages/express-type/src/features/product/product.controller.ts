import { type Request, type Response } from "express";
import { asyncHandler } from "@/middlewares/asyncHandler.js";
import { sendSuccess } from "@/utils/response.js";
import type { CreateProductDto, UpdateProductDto } from "./product.model.js";
import * as productService from "./product.service.js";

// Request bodies and params are already validated by `validate()` in product.route.ts.

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
  const dto: CreateProductDto = req.body;
  const product = await productService.createProduct(dto);
  sendSuccess(res, product, "Product created successfully", 201);
});

/**
 * PATCH /api/v1/products/:id
 * Partially updates a product (admin only).
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto: UpdateProductDto = req.body;
  const product = await productService.updateProduct(String(req.params.id), dto);
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
