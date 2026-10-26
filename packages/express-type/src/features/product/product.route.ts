import { Router } from "express";
import { z } from "@/lib/zod.js";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./product.controller.js";
import {
  createProductBody,
  productIdParams,
  productResponse,
  updateProductBody,
} from "./product.schema.js";
import { authenticate, authorize } from "@/features/auth/auth.middleware.js";
import { validate } from "@/middlewares/validate.js";
import { bearerAuth, errorResponse, jsonBody, registry, successResponse } from "@/docs/openapi.js";

export const productRouter = Router();

/**
 * Product Routes — mounted at /api/v1/products
 *
 * GET    /api/v1/products       → List all products (public)
 * GET    /api/v1/products/:id   → Get product by ID (public)
 * POST   /api/v1/products       → Create product (admin only)
 * PATCH  /api/v1/products/:id   → Update product (admin only)
 * DELETE /api/v1/products/:id   → Delete product (admin only)
 */

// ── Public Routes ─────────────────────────────────────────────────────────────
productRouter.get("/", getAllProducts);
productRouter.get("/:id", validate({ params: productIdParams }), getProductById);

// ── Admin-Only Routes ─────────────────────────────────────────────────────────
productRouter.post(
  "/",
  authenticate,
  authorize("admin"),
  validate({ body: createProductBody }),
  createProduct
);
productRouter.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validate({ params: productIdParams, body: updateProductBody }),
  updateProduct
);
productRouter.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validate({ params: productIdParams }),
  deleteProduct
);

// ── OpenAPI Docs ──────────────────────────────────────────────────────────────
const tags = ["Products"];
const security = [{ [bearerAuth.name]: [] }];

registry.registerPath({
  method: "get",
  path: "/api/v1/products",
  tags,
  summary: "List products",
  responses: { 200: successResponse(z.array(productResponse), "Products retrieved") },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/products/{id}",
  tags,
  summary: "Get a product by ID",
  request: { params: productIdParams },
  responses: {
    200: successResponse(productResponse, "Product retrieved"),
    404: errorResponse("Product not found"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/products",
  tags,
  summary: "Create a product (admin)",
  security,
  request: { body: jsonBody(createProductBody) },
  responses: {
    201: successResponse(productResponse, "Product created"),
    400: errorResponse("Validation failed"),
    401: errorResponse("Not authenticated"),
    403: errorResponse("Not an admin"),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/products/{id}",
  tags,
  summary: "Update a product (admin)",
  security,
  request: { params: productIdParams, body: jsonBody(updateProductBody) },
  responses: {
    200: successResponse(productResponse, "Product updated"),
    400: errorResponse("Validation failed"),
    401: errorResponse("Not authenticated"),
    403: errorResponse("Not an admin"),
    404: errorResponse("Product not found"),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/products/{id}",
  tags,
  summary: "Delete a product (admin)",
  security,
  request: { params: productIdParams },
  responses: {
    200: successResponse(z.null(), "Product deleted"),
    401: errorResponse("Not authenticated"),
    403: errorResponse("Not an admin"),
    404: errorResponse("Product not found"),
  },
});
