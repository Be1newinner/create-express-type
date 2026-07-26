import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./product.controller.js";
import { authenticate, authorize } from "@/features/auth/auth.middleware.js";

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
productRouter.get("/:id", getProductById);

// ── Admin-Only Routes ─────────────────────────────────────────────────────────
productRouter.post("/", authenticate, authorize("admin"), createProduct);
productRouter.patch("/:id", authenticate, authorize("admin"), updateProduct);
productRouter.delete("/:id", authenticate, authorize("admin"), deleteProduct);
