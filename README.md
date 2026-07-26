# create-express-type

> Scaffold a production-ready TypeScript + Express.js project in seconds.

[![npm version](https://img.shields.io/npm/v/create-express-type.svg?color=blue)](https://www.npmjs.com/package/create-express-type)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

`create-express-type` is an interactive CLI scaffolding tool that builds modern, secure, and production-ready Express.js + TypeScript APIs with sensible defaults.

---

## 🌟 Key Features

- 🚀 **TypeScript First**: Strict type-checking with ESM modules and Node 18+ support.
- ⚡ **Interactive CLI Wizard**: Built with `@clack/prompts` for smooth DX.
- 🗄️ **Database Support**: Built-in setup for **PostgreSQL + Prisma** or **MongoDB + Mongoose** (or pure Express).
- 🪵 **Structured Logging**: Powered by **Pino** and **Pino-HTTP** (pretty-printed in dev, JSON in prod).
- 🆔 **Distributed Tracing**: Automatic `X-Request-Id` UUID generation and header propagation.
- 🛡️ **Production Security**: Pre-configured **Helmet**, **CORS**, **Express Rate Limit**, and Zod payload limits.
- 🗜️ **Gzip Compression**: Optimized HTTP responses out of the box.
- 🔍 **Fail-Fast Environment Validation**: Zod-validated environment schema at application startup.
- 🎨 **Code Quality Setup**: **ESLint** (v9 flat config), **Prettier**, **Husky**, and **lint-staged**.
- 🧪 **Test Suite**: Integration and unit testing ready with **Vitest** and **Supertest**.
- 🐙 **Git Ready**: Auto `git init`, initial commit, and template ZIP caching.

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
| `-y`, `--yes` | Skip interactive prompts and use default configuration |
| `-v`, `--version` | Print CLI version |
| `-h`, `--help` | Display help menu |

### Non-Interactive Usage (CI / Power Users)

```bash
npx create-express-type my-api --yes
```

---

## 🗂️ Scaffolded Project Structure

```
my-express-api/
├── .husky/              # Git pre-commit hooks (lint-staged)
├── .vscode/             # Recommended extensions & format-on-save settings
├── __tests__/           # Integration and unit tests with Vitest & Supertest
├── prisma/              # Prisma schema & migrations (if Prisma selected)
├── src/
│   ├── config/          # Zod environment variable schema & validation
│   ├── features/        # Feature-based modules (auth, product)
│   │   ├── auth/        # Auth controller, service, route, middleware, model
│   │   └── product/     # Product CRUD controller, service, route, middleware
│   ├── lib/             # Pino logger, DB clients (Prisma / Mongoose)
│   ├── middlewares/     # Global error handler, rate limiter, requestId, 404
│   ├── routes/          # Central API router index (/api/v1)
│   ├── utils/           # Typed API response helpers & utility functions
│   └── index.ts         # Main Express application entry point
├── .env.example         # Documented environment variable template
├── docker-compose.yml   # PostgreSQL + Redis local dev services
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
| `npm run db:push` | Sync Prisma schema with database (if Prisma selected) |
| `npm run db:studio` | Open Prisma Studio UI (if Prisma selected) |

---

## 🤝 Contributing

Contributions are welcome! Please check the [Contributing Guide](CONTRIBUTE.md) for local setup and guidelines.

---

## 📄 License

[ISC License](LICENSE) © [be1newinner](https://github.com/Be1newinner)
