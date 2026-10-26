# create-express-type

> Scaffold a production-ready TypeScript + Express.js project in seconds.

[![npm version](https://img.shields.io/npm/v/create-express-type.svg?color=blue)](https://www.npmjs.com/package/create-express-type)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

`create-express-type` is an interactive CLI scaffolding tool that builds modern, secure, and production-ready Express.js + TypeScript APIs with sensible defaults.

---

## 🌟 Key Features

- 🚀 **TypeScript First**: Strict type-checking with ESM modules and Node 20+ support.
- ⚡ **Interactive or Fully Scripted**: `@clack/prompts` wizard, or pass every choice as a flag for CI and automation.
- 🗄️ **Database Support**: **PostgreSQL + Prisma**, **PostgreSQL + Drizzle**, or **MongoDB + Mongoose** (or pure Express).
- ✅ **Request Validation**: `validate({ body, query, params })` middleware with Zod — returns every failing field at once.
- 📖 **API Docs from Your Schemas**: OpenAPI 3 generated from the same Zod schemas, with Swagger UI at `/docs`.
- 🧩 **Feature Generator**: `npm run gen:feature -- order` scaffolds a full CRUD module, its docs and its tests.
- 🐳 **Docker Ready**: Multi-stage `Dockerfile` (non-root, healthcheck) and a `docker-compose.yml` matched to your database.
- 🪵 **Structured Logging**: Powered by **Pino** and **Pino-HTTP** (pretty-printed in dev, JSON in prod).
- 🆔 **Distributed Tracing**: Automatic `X-Request-Id` UUID generation and header propagation.
- 🛡️ **Production Security**: Pre-configured **Helmet**, **CORS**, **Express Rate Limit**, and Zod payload limits.
- 🗜️ **Gzip Compression**: Optimized HTTP responses out of the box.
- 🔍 **Fail-Fast Environment Validation**: Zod-validated environment schema at application startup.
- 🎨 **Code Quality Setup**: **ESLint** (v9 flat config), **Prettier**, **Husky**, and **lint-staged**.
- 🧪 **Test Suite**: Integration tests with **Vitest** and **Supertest**, passing out of the box.
- 🐙 **Git Ready**: Auto `git init` and an initial commit (lockfile included).
- 📦 **Works Offline**: Templates ship inside the package — always in sync with the CLI version.

---

## 🚀 Quickstart

Run `create-express-type` with any package manager:

```bash
# Using npx (npm)
npx create-express-type my-express-api

# Using pnpm
pnpm create express-type my-express-api

# Using yarn
yarn create express-type my-express-api

# Using bun
bun create express-type my-express-api
```

---

## 💻 CLI Options & Non-Interactive Mode

### Options

| Flag | Description |
| --- | --- |
| `--db <name>` | Database: `none`, `prisma`, `drizzle`, `mongoose` |
| `--pm <name>` | Package manager: `npm`, `pnpm`, `yarn`, `bun` |
| `--install` / `--no-install` | Install dependencies (default: yes) |
| `--git` / `--no-git` | Initialize git and make an initial commit (default: yes) |
| `-y`, `--yes` | Use defaults for anything not passed as a flag |
| `-v`, `--version` | Print CLI version |
| `-h`, `--help` | Display help menu |

Any flag you pass skips its prompt. With `--yes`, the remaining choices use their defaults
(no database, the package manager you launched the CLI with, install + git on).

### Non-Interactive Usage (CI / Power Users)

```bash
npx create-express-type my-api --yes
npx create-express-type my-api --db drizzle --pm pnpm --yes
npx create-express-type my-api --db prisma --no-install --no-git --yes
```

---

## 🗂️ Scaffolded Project Structure

```
my-express-api/
├── .husky/              # Git pre-commit hooks (lint-staged)
├── .vscode/             # Recommended extensions & format-on-save settings
├── __tests__/           # Integration tests with Vitest & Supertest
├── prisma/              # Prisma schema (if Prisma selected)
├── scripts/             # gen-feature.mjs — the feature generator
├── src/
│   ├── config/          # Zod environment variable schema & validation
│   ├── db/              # Drizzle schema (if Drizzle selected)
│   ├── docs/            # OpenAPI registry & document builder
│   ├── features/        # Feature-based modules (auth, product)
│   │   ├── auth/        # schema, model, service, controller, route, middleware
│   │   └── product/     # schema, model, service, controller, route
│   ├── lib/             # Pino logger, Zod (with OpenAPI), database client & lifecycle
│   ├── middlewares/     # validate(), error handler, rate limiter, requestId, 404
│   ├── routes/          # Central API router index (/api/v1)
│   ├── utils/           # Typed API response helpers & utility functions
│   ├── app.ts           # Express app (imported by tests)
│   └── index.ts         # Server entry point: DB connect, listen, graceful shutdown
├── .env.example         # Documented environment variable template
├── Dockerfile           # Multi-stage production image
├── docker-compose.yml   # The API + your database (PostgreSQL or MongoDB)
├── eslint.config.js     # Flat ESLint config
├── prettier.config.js   # Prettier config
├── vitest.config.ts     # Vitest configuration
└── package.json
```

---

## 📜 Available Scripts in Scaffolded Project

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server with hot-reload (`tsx watch`) |
| `npm run check` | Run TypeScript type check (`tsc --noEmit`) |
| `npm run lint` | Run ESLint across `src/` |
| `npm run lint:fix` | Automatically fix ESLint warnings and errors |
| `npm run build` | Bundle application for production using `esbuild` |
| `npm run start` | Run compiled production build from `dist/index.js` |
| `npm run test` | Run test suite with Vitest |
| `npm run gen:feature -- <name>` | Scaffold a CRUD feature module, its API docs and tests |
| `npm run db:push` | Sync the schema with the database (Prisma / Drizzle) |
| `npm run db:generate` | Generate the Prisma client / Drizzle SQL migrations |
| `npm run db:migrate` | Create & apply migrations (Prisma / Drizzle) |
| `npm run db:studio` | Open Prisma Studio / Drizzle Studio |

---

## 🧩 Validation & API Docs

Each feature defines its Zod schemas once, in `<feature>.schema.ts`. The same schemas
validate requests and generate the OpenAPI document:

```ts
// product.route.ts
productRouter.post("/", authenticate, validate({ body: createProductBody }), createProduct);

registry.registerPath({
  method: "post",
  path: "/api/v1/products",
  request: { body: jsonBody(createProductBody) },
  responses: { 201: successResponse(productResponse, "Product created") },
});
```

Invalid requests get a `400` listing every failing field:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "path": "body.email", "message": "Invalid email address" },
    { "path": "body.password", "message": "Required" }
  ]
}
```

Swagger UI is served at `/docs` (raw spec at `/docs/openapi.json`). It is enabled by
default except when `NODE_ENV=production`; override with `API_DOCS_ENABLED=true|false`.

---

## 🐳 Docker

```bash
cp .env.example .env
docker compose up --build            # the API + your database
docker compose up -d postgres        # or only the database, for local `npm run dev`
```

The `Dockerfile` installs with your chosen package manager, bundles with esbuild, and runs
as the non-root `node` user with a `/health` healthcheck.

---

## 🤝 Contributing

Contributions are welcome! Please check the [Contributing Guide](CONTRIBUTE.md) for local setup and guidelines.

---

## 📄 License

[ISC License](LICENSE) © [be1newinner](https://github.com/Be1newinner)
