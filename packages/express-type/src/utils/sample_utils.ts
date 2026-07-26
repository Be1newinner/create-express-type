/**
 * General-purpose utility functions.
 *
 * These are standalone helpers that can be used anywhere in the codebase.
 * Add your own utilities here as your project grows.
 */

// ─── Object Utilities ─────────────────────────────────────────────────────────

/**
 * Returns a new object containing only the specified keys.
 * Useful for selecting safe fields before returning data to clients.
 *
 * @example
 *   const user = { id: 1, email: "a@b.com", password: "hash" };
 *   pick(user, ["id", "email"]); // → { id: 1, email: "a@b.com" }
 */
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  return keys.reduce(
    (acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    },
    {} as Pick<T, K>
  );
};

/**
 * Returns a new object with the specified keys removed.
 * Useful for stripping sensitive fields like passwords before sending responses.
 *
 * @example
 *   const user = { id: 1, email: "a@b.com", password: "hash" };
 *   omit(user, ["password"]); // → { id: 1, email: "a@b.com" }
 */
export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result as Omit<T, K>;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginates an in-memory array.
 * When you add a database, use LIMIT/OFFSET (SQL) or skip/take (Prisma) instead.
 *
 * @example
 *   const result = paginate(allUsers, 2, 10); // page 2, 10 per page
 *   result.data        // → users on page 2
 *   result.totalPages  // → total number of pages
 */
export const paginate = <T>(
  items: T[],
  page: number = 1,
  limit: number = 10
): PaginationResult<T> => {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const start = (safePage - 1) * safeLimit;
  return {
    data: items.slice(start, start + safeLimit),
    total: items.length,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(items.length / safeLimit),
  };
};

// ─── Async Utilities ──────────────────────────────────────────────────────────

/**
 * Pauses execution for the given number of milliseconds.
 * Useful for testing, backoff strategies, or simulating latency.
 *
 * @example
 *   await sleep(500); // wait 500ms
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ─── String Utilities ─────────────────────────────────────────────────────────

/**
 * Capitalizes the first letter of a string.
 *
 * @example
 *   capitalize("hello world"); // → "Hello world"
 */
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Converts a string to a URL-friendly slug.
 *
 * @example
 *   slugify("Hello World!"); // → "hello-world"
 */
export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
