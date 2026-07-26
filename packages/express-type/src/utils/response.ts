import { type Response } from "express";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

interface ApiErrorResponse {
  success: false;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

/**
 * Sends a successful JSON response with a consistent shape.
 *
 * @example
 *   sendSuccess(res, { id: 1, name: "Alice" }, "User fetched", 200);
 *   sendSuccess(res, users, "Users listed", 200, { total: 100, page: 1, limit: 10, totalPages: 10 });
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200,
  meta?: PaginationMeta
): Response<ApiSuccessResponse<T>> => {
  const body: ApiSuccessResponse<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Sends an error JSON response.
 * Prefer throwing AppError inside route handlers and letting errorHandler deal with it.
 * Use this only for simple inline error responses.
 *
 * @example
 *   sendError(res, "Not found", 404);
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400
): Response<ApiErrorResponse> => {
  return res.status(statusCode).json({ success: false, message });
};
