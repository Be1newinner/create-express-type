import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

/**
 * Zod, extended with `.openapi()` so schemas can carry OpenAPI metadata
 * (examples, descriptions) for the generated API docs at /docs.
 *
 * Always import `z` from here (not from "zod") in request/response schemas.
 */
extendZodWithOpenApi(z);

export { z };
