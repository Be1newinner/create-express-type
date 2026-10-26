#!/usr/bin/env node
/**
 * Feature generator — scaffolds a CRUD feature module and registers its router.
 *
 * Usage:
 *   npm run gen:feature -- <name>        e.g.  npm run gen:feature -- order-item
 *
 * Creates (for "order-item"):
 *   src/features/order-item/order-item.{schema,model,service,controller,route}.ts
 *   __tests__/order-item.test.ts
 * and mounts the router at /api/v1/order-items in src/routes/index.ts.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROUTES_INDEX = path.join(ROOT, "src", "routes", "index.ts");

// ─── Names ────────────────────────────────────────────────────────────────────

const input = process.argv[2];

if (!input || input === "--help" || input === "-h") {
  console.log("Usage: npm run gen:feature -- <name>   (e.g. order-item)");
  process.exit(input ? 0 : 1);
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(input)) {
  console.error(`❌ Invalid feature name "${input}". Use kebab-case, e.g. "order" or "order-item".`);
  process.exit(1);
}

const kebab = input;
const camel = kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = camel[0].toUpperCase() + camel.slice(1);
const title = kebab
  .split("-")
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(" ");

/** Naive English pluralization — good enough for route paths; rename if needed. */
const pluralize = (word) => {
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/.test(word)) return word + "es";
  return word + "s";
};
const pluralKebab = pluralize(kebab);
const pluralTitle = pluralize(title);
const pluralPascal = pluralize(pascal);
const routePath = `/api/v1/${pluralKebab}`;

const featureDir = path.join(ROOT, "src", "features", kebab);
const testFile = path.join(ROOT, "__tests__", `${kebab}.test.ts`);

if (!existsSync(ROUTES_INDEX)) {
  console.error("❌ src/routes/index.ts not found. Run this from the project root.");
  process.exit(1);
}
if (existsSync(featureDir)) {
  console.error(`❌ src/features/${kebab} already exists.`);
  process.exit(1);
}

// ─── Templates ────────────────────────────────────────────────────────────────

const files = {
  [`${kebab}.schema.ts`]: `import { z } from "@/lib/zod.js";
import { registry } from "@/docs/openapi.js";

/**
 * ${title} request/response schemas.
 *
 * Used by \`validate()\` in ${kebab}.route.ts for runtime validation AND
 * registered with the OpenAPI registry for the docs at /docs.
 */

const ${camel}Fields = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be at most 100 characters")
    .openapi({ example: "My ${title.toLowerCase()}" }),
});

export const ${camel}IdParams = z.object({
  id: z.string().min(1, "${title} ID is required"),
});

export const create${pascal}Body = registry.register("Create${pascal}Input", ${camel}Fields);

export const update${pascal}Body = registry.register("Update${pascal}Input", ${camel}Fields.partial());

export const ${camel}Response = registry.register(
  "${pascal}",
  ${camel}Fields.extend({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);
`,

  [`${kebab}.model.ts`]: `/**
 * ${title} Domain — Types & DTOs
 */
import type { z } from "zod";
import type { create${pascal}Body, update${pascal}Body } from "./${kebab}.schema.js";

// ─── Core Entity ──────────────────────────────────────────────────────────────

export interface ${pascal} {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Data Transfer Objects ────────────────────────────────────────────────────
// Derived from the Zod schemas, so types and validation rules can't drift apart.

export type Create${pascal}Dto = z.infer<typeof create${pascal}Body>;

export type Update${pascal}Dto = z.infer<typeof update${pascal}Body>;
`,

  [`${kebab}.service.ts`]: `import { AppError } from "@/middlewares/errorHandler.js";
import type { Create${pascal}Dto, ${pascal}, Update${pascal}Dto } from "./${kebab}.model.js";

// ─── In-Memory Store (Replace with your Database) ────────────────────────────
const ${camel}Store: ${pascal}[] = [];

// ─── Service Functions ────────────────────────────────────────────────────────

export const getAll = async (): Promise<${pascal}[]> => {
  return ${camel}Store;
};

export const getById = async (id: string): Promise<${pascal}> => {
  const item = ${camel}Store.find((i) => i.id === id);
  if (!item) throw new AppError("${title} not found", 404);
  return item;
};

export const create = async (dto: Create${pascal}Dto): Promise<${pascal}> => {
  const item: ${pascal} = {
    id: crypto.randomUUID(),
    ...dto,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  ${camel}Store.push(item);
  return item;
};

export const update = async (id: string, dto: Update${pascal}Dto): Promise<${pascal}> => {
  const index = ${camel}Store.findIndex((i) => i.id === id);
  if (index === -1) throw new AppError("${title} not found", 404);
  ${camel}Store[index] = { ...${camel}Store[index], ...dto, updatedAt: new Date() };
  return ${camel}Store[index];
};

export const remove = async (id: string): Promise<void> => {
  const index = ${camel}Store.findIndex((i) => i.id === id);
  if (index === -1) throw new AppError("${title} not found", 404);
  ${camel}Store.splice(index, 1);
};
`,

  [`${kebab}.controller.ts`]: `import { type Request, type Response } from "express";
import { asyncHandler } from "@/middlewares/asyncHandler.js";
import { sendSuccess } from "@/utils/response.js";
import type { Create${pascal}Dto, Update${pascal}Dto } from "./${kebab}.model.js";
import * as ${camel}Service from "./${kebab}.service.js";

// Request bodies and params are already validated by \`validate()\` in ${kebab}.route.ts.

/** GET ${routePath} */
export const getAll${pluralPascal} = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const items = await ${camel}Service.getAll();
  sendSuccess(res, items, "${pluralTitle} retrieved successfully");
});

/** GET ${routePath}/:id */
export const get${pascal}ById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const item = await ${camel}Service.getById(String(req.params.id));
  sendSuccess(res, item, "${title} retrieved successfully");
});

/** POST ${routePath} */
export const create${pascal} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto: Create${pascal}Dto = req.body;
  const item = await ${camel}Service.create(dto);
  sendSuccess(res, item, "${title} created successfully", 201);
});

/** PATCH ${routePath}/:id */
export const update${pascal} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto: Update${pascal}Dto = req.body;
  const item = await ${camel}Service.update(String(req.params.id), dto);
  sendSuccess(res, item, "${title} updated successfully");
});

/** DELETE ${routePath}/:id */
export const delete${pascal} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await ${camel}Service.remove(String(req.params.id));
  sendSuccess(res, null, "${title} deleted successfully");
});
`,

  [`${kebab}.route.ts`]: `import { Router } from "express";
import { z } from "@/lib/zod.js";
import {
  getAll${pluralPascal},
  get${pascal}ById,
  create${pascal},
  update${pascal},
  delete${pascal},
} from "./${kebab}.controller.js";
import {
  create${pascal}Body,
  ${camel}IdParams,
  ${camel}Response,
  update${pascal}Body,
} from "./${kebab}.schema.js";
import { authenticate } from "@/features/auth/auth.middleware.js";
import { validate } from "@/middlewares/validate.js";
import { bearerAuth, errorResponse, jsonBody, registry, successResponse } from "@/docs/openapi.js";

export const ${camel}Router = Router();

/**
 * ${title} Routes — mounted at ${routePath}
 *
 * GET    ${routePath}       → List (public)
 * GET    ${routePath}/:id   → Get by ID (public)
 * POST   ${routePath}       → Create (requires auth)
 * PATCH  ${routePath}/:id   → Update (requires auth)
 * DELETE ${routePath}/:id   → Delete (requires auth)
 */

// ── Public Routes ─────────────────────────────────────────────────────────────
${camel}Router.get("/", getAll${pluralPascal});
${camel}Router.get("/:id", validate({ params: ${camel}IdParams }), get${pascal}ById);

// ── Protected Routes ──────────────────────────────────────────────────────────
${camel}Router.post("/", authenticate, validate({ body: create${pascal}Body }), create${pascal});
${camel}Router.patch(
  "/:id",
  authenticate,
  validate({ params: ${camel}IdParams, body: update${pascal}Body }),
  update${pascal}
);
${camel}Router.delete("/:id", authenticate, validate({ params: ${camel}IdParams }), delete${pascal});

// ── OpenAPI Docs ──────────────────────────────────────────────────────────────
const tags = ["${pluralTitle}"];
const security = [{ [bearerAuth.name]: [] }];

registry.registerPath({
  method: "get",
  path: "${routePath}",
  tags,
  summary: "List ${pluralTitle.toLowerCase()}",
  responses: { 200: successResponse(z.array(${camel}Response), "${pluralTitle} retrieved") },
});

registry.registerPath({
  method: "get",
  path: "${routePath}/{id}",
  tags,
  summary: "Get a ${title.toLowerCase()} by ID",
  request: { params: ${camel}IdParams },
  responses: {
    200: successResponse(${camel}Response, "${title} retrieved"),
    404: errorResponse("${title} not found"),
  },
});

registry.registerPath({
  method: "post",
  path: "${routePath}",
  tags,
  summary: "Create a ${title.toLowerCase()}",
  security,
  request: { body: jsonBody(create${pascal}Body) },
  responses: {
    201: successResponse(${camel}Response, "${title} created"),
    400: errorResponse("Validation failed"),
    401: errorResponse("Not authenticated"),
  },
});

registry.registerPath({
  method: "patch",
  path: "${routePath}/{id}",
  tags,
  summary: "Update a ${title.toLowerCase()}",
  security,
  request: { params: ${camel}IdParams, body: jsonBody(update${pascal}Body) },
  responses: {
    200: successResponse(${camel}Response, "${title} updated"),
    400: errorResponse("Validation failed"),
    401: errorResponse("Not authenticated"),
    404: errorResponse("${title} not found"),
  },
});

registry.registerPath({
  method: "delete",
  path: "${routePath}/{id}",
  tags,
  summary: "Delete a ${title.toLowerCase()}",
  security,
  request: { params: ${camel}IdParams },
  responses: {
    200: successResponse(z.null(), "${title} deleted"),
    401: errorResponse("Not authenticated"),
    404: errorResponse("${title} not found"),
  },
});
`,
};

const testTemplate = `import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";

describe("${pluralKebab}", () => {
  let token: string;
  let id: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "${title} Tester",
      email: "${kebab}-tester@example.com",
      password: "password123",
    });
    token = res.body.data.token;
  });

  it("requires authentication to create", async () => {
    const res = await request(app).post("${routePath}").send({ name: "Test" });

    expect(res.status).toBe(401);
  });

  it("validates the request body", async () => {
    const res = await request(app)
      .post("${routePath}")
      .set("Authorization", \`Bearer \${token}\`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe("body.name");
  });

  it("creates, reads, updates and deletes", async () => {
    const created = await request(app)
      .post("${routePath}")
      .set("Authorization", \`Bearer \${token}\`)
      .send({ name: "First" });
    expect(created.status).toBe(201);
    id = created.body.data.id;

    const fetched = await request(app).get(\`${routePath}/\${id}\`);
    expect(fetched.body.data.name).toBe("First");

    const updated = await request(app)
      .patch(\`${routePath}/\${id}\`)
      .set("Authorization", \`Bearer \${token}\`)
      .send({ name: "Renamed" });
    expect(updated.body.data.name).toBe("Renamed");

    const deleted = await request(app)
      .delete(\`${routePath}/\${id}\`)
      .set("Authorization", \`Bearer \${token}\`);
    expect(deleted.status).toBe(200);

    const missing = await request(app).get(\`${routePath}/\${id}\`);
    expect(missing.status).toBe(404);
  });
});
`;

// ─── Register the router in src/routes/index.ts ───────────────────────────────

const routerImport = `import { ${camel}Router } from "@/features/${kebab}/${kebab}.route.js";`;
const routerMount = `apiRouter.use("/${pluralKebab}", ${camel}Router);`;

let routesIndex = readFileSync(ROUTES_INDEX, "utf-8");

if (routesIndex.includes(routerMount)) {
  console.error(`❌ ${routerMount} is already registered in src/routes/index.ts.`);
  process.exit(1);
}

// Insert the import after the last import statement
const imports = [...routesIndex.matchAll(/^import .*;$/gm)];
const lastImport = imports.at(-1);
if (lastImport) {
  const end = lastImport.index + lastImport[0].length;
  routesIndex = routesIndex.slice(0, end) + "\n" + routerImport + routesIndex.slice(end);
} else {
  routesIndex = routerImport + "\n" + routesIndex;
}
routesIndex = routesIndex.trimEnd() + "\n" + routerMount + "\n";

// ─── Write ────────────────────────────────────────────────────────────────────

mkdirSync(featureDir, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  writeFileSync(path.join(featureDir, name), content);
}
mkdirSync(path.dirname(testFile), { recursive: true });
if (!existsSync(testFile)) writeFileSync(testFile, testTemplate);
writeFileSync(ROUTES_INDEX, routesIndex);

// Match the project's code style (best effort — skipped if Prettier isn't installed)
try {
  execFileSync("npx", ["--no-install", "prettier", "--write", featureDir, testFile, ROUTES_INDEX], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
} catch {
  // Formatting is cosmetic; the generated code is valid either way
}

console.log(`✅ Created feature "${kebab}"`);
for (const name of Object.keys(files)) console.log(`   src/features/${kebab}/${name}`);
console.log(`   __tests__/${kebab}.test.ts`);
console.log(`   Mounted at ${routePath} (src/routes/index.ts)`);
console.log(`\n   Docs:  /docs   ·   Tests:  npm test`);
