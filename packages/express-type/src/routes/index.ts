import { Router } from "express";
import { authRouter } from "@/features/auth/auth.route.js";
import { productRouter } from "@/features/product/product.route.js";

/**
 * Central API Router
 *
 * All feature routers are registered here and mounted under /api/v1 in index.ts.
 * To add a new feature, import its router and add it below.
 *
 * Example:
 *   import { orderRouter } from "@/features/order/order.route.js";
 *   apiRouter.use("/orders", orderRouter);
 */
export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/products", productRouter);
