# Production-Ready TypeScript + Express.js API Boilerplate

> Clean, secure, and modular Express 5 + TypeScript boilerplate with Pino logging, Zod validation, security headers, rate limiting, and Vitest testing setup.

---

## 🌟 Included Features

- 🚀 **Express.js 5 & TypeScript**: Built on modern Node.js (>=18) with full ESM support.
- 🪵 **Structured Pino Logging**: Pino logger with colorized pretty output in development and JSON in production.
- 🆔 **Request Tracing**: `X-Request-Id` UUID middleware attached to all requests & responses.
- 🛡️ **Production Security**: Security headers (`helmet`), CORS configuration, global & auth rate limiters (`express-rate-limit`), and payload body limits.
- 🗜️ **Response Compression**: Built-in Gzip compression (`compression`).
- 🔍 **Fail-Fast Environment Config**: Zod-validated environment schema (`src/config/env.ts`) that halts server boot if variables are missing or invalid.
- 📂 **Modular Architecture**: Feature-sliced structure (`auth`, `product`) separating routes, controllers, services, models, and middlewares.
- 💥 **Robust Error Handling**: Custom `AppError` operational error class, `asyncHandler` wrapper, global error handler, and JSON 404 handler.
- 🧪 **Vitest & Supertest Integration**: Pre-configured test runner with sample integration tests.
- 🎨 **Code Quality Pipeline**: ESLint (v9 flat config), Prettier, Husky pre-commit hooks, and `lint-staged`.
- 🧰 **VS Code Workspace**: Includes settings for format-on-save, ESLint auto-fix, and extension recommendations.

---

## 📂 Project Directory Layout

```
express-ts-app/
├── .husky/              # Pre-commit hook configurations
├── .vscode/             # Recommended VS Code settings & extensions
├── __tests__/           # Integration and unit tests
│   ├── integration/     # API endpoint integration tests
│   ├── unit/            # Unit tests
│   └── setup.ts         # Vitest environment setup
├── docker-compose.yml   # PostgreSQL & Redis container definitions
├── esbuild.config.js     # Fast production bundler script
├── eslint.config.js     # Flat ESLint rules
├── prettier.config.js   # Code formatting rules
├── vitest.config.ts     # Vitest configuration
├── .env.example         # Environment variable template
└── src/
    ├── config/          # Environment configuration (env.ts)
    ├── features/        # Modular feature domains
    │   ├── auth/        # Authentication module (routes, controllers, services, models)
    │   └── product/     # Product CRUD module
    ├── lib/             # Pino logger instance (and DB clients if configured)
    ├── middlewares/     # Global error handler, rate limiter, request ID, 404
    ├── routes/          # Central API router registry (/api/v1)
    ├── utils/           # Typed response helpers & utility functions
    └── index.ts         # Server entry point & graceful shutdown
```

---

## 🚀 Quickstart

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure `JWT_SECRET` is set to a secure string (at least 32 characters).

### 3. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8005`.

---

## 📜 NPM Scripts

| Script | Command | Description |
| --- | --- | --- |
| `npm run dev` | `tsx watch src/index.ts` | Development server with hot-reloading |
| `npm run check` | `tsc --noEmit` | Type-check without emitting JavaScript |
| `npm run lint` | `npx eslint src` | Check code for lint errors |
| `npm run lint:fix` | `npx eslint src --fix` | Automatically fix lint issues |
| `npm run build` | `node esbuild.config.js` | Compile production bundle into `dist/` |
| `npm run start` | `node dist/index.js` | Run compiled production bundle |
| `npm run test` | `vitest run` | Run Vitest test suite |
| `npm run test:watch` | `vitest` | Run Vitest in watch mode |
| `npm run test:coverage`| `vitest run --coverage` | Generate test coverage report |

---

## 🌐 API Routes Summary

### Base Endpoints

- `GET /health` — Application status, uptime, node environment, and DB connection status

### Auth Endpoints (`/api/v1/auth`)

- `POST /register` — Register a new user
- `POST /login` — Authenticate and receive JWT token
- `GET /me` — Get authenticated user profile (requires `Authorization: Bearer <token>`)

### Product Endpoints (`/api/v1/products`)

- `GET /` — List products
- `GET /:id` — Get product details
- `POST /` — Create product (admin role required)
- `PATCH /:id` — Update product (admin role required)
- `DELETE /:id` — Remove product (admin role required)

---

## 🗄️ Database Integration Guide

This boilerplate supports seamless database integration:

### Using PostgreSQL + Prisma

1. Install Prisma:
   ```bash
   npm install @prisma/client
   npm install --save-dev prisma
   ```
2. Initialize Prisma:
   ```bash
   npx prisma init
   ```
3. Set `DATABASE_URL` in `.env` and `src/config/env.ts`.

### Using MongoDB + Mongoose

1. Install Mongoose:
   ```bash
   npm install mongoose
   ```
2. Set `MONGODB_URI` in `.env` and `src/config/env.ts`.

---

## 🔒 Security Best Practices Implemented

1. **Structured Logging**: Sensitive fields are excluded from production log outputs.
2. **Payload Protection**: Express JSON body parser is restricted to `10kb` to prevent payload flood attacks.
3. **HTTP Security Headers**: `helmet` is enabled to enforce HSTS, X-Content-Type-Options, and X-XSS-Protection.
4. **Rate Limiting**: `express-rate-limit` prevents brute-force attempts on sensitive auth routes and caps API traffic.
5. **Operational Error Isolation**: Unhandled exceptions are masked in production to prevent stack trace leaks.

---

## 📄 License

[ISC License](LICENSE)
