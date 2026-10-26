# syntax=docker/dockerfile:1

# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
WORKDIR /app
ENV HUSKY=0
# Prisma's query engine needs OpenSSL
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# ─── Build: install all dependencies and bundle the app ───────────────────────
FROM base AS build
COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/
# The schema must be present for `prisma generate` (postinstall)
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

# ─── Production dependencies only ─────────────────────────────────────────────
FROM base AS deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/
# The schema must be present for `prisma generate` (postinstall)
COPY prisma ./prisma
RUN npm ci --omit=dev

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Kept for `npx prisma migrate deploy` in the container
COPY --from=build --chown=node:node /app/prisma ./prisma
USER node
EXPOSE 8005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8005) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/index.js"]
