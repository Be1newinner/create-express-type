#!/usr/bin/env node

import {
  intro,
  outro,
  text,
  confirm,
  select,
  spinner,
  isCancel,
  cancel,
  log,
} from "@clack/prompts";
import { existsSync, createWriteStream, mkdirSync, writeFileSync, rmSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { homedir } from "os";
import yauzl from "yauzl";

// ─── Constants ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf-8")) as {
  version: string;
};

const REPO_ZIP_URL =
  "https://github.com/Be1newinner/create-express-type/archive/refs/heads/main.zip";
const REPO_SUBDIR = "create-express-type-main/packages/express-type/";

// ─── Types ────────────────────────────────────────────────────────────────────

type DatabaseChoice = "none" | "prisma" | "mongoose";

// ─── Database File Templates ──────────────────────────────────────────────────

const PRISMA_SCHEMA = `\
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Example Model ─────────────────────────────────────────────────────────────
// Replace the User interface in src/features/auth/auth.model.ts with Prisma's
// generated types once you run: npx prisma generate

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

const PRISMA_LIB = `\
import { PrismaClient } from "@prisma/client";

// Prevent multiple PrismaClient instances in development (hot-reload / tsx watch)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;

const MONGOOSE_LIB = `\
import mongoose from "mongoose";
import { env } from "@/config/env.js";

/**
 * Opens a Mongoose connection to MongoDB.
 * Called at application startup, before app.listen().
 */
export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5_000,
  });
  console.log("🍃 MongoDB connected");
}

/**
 * Gracefully closes the Mongoose connection.
 * Called during server shutdown.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("🍃 MongoDB disconnected");
}

/**
 * Returns current MongoDB connection health status string.
 */
export function getDbStatus(): string {
  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] || "unknown";
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Validates that a string is a valid npm package name */
function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

/** Detects which package managers are available on the system */
function detectAvailablePackageManagers(): string[] {
  const managers = ["npm", "pnpm", "yarn", "bun"];
  return managers.filter((pm) => {
    try {
      execSync(`${pm} --version`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
}

/** Caches template zip locally to avoid re-downloading on every run */
async function getTemplateZip(): Promise<Buffer> {
  const cacheDir = path.join(homedir(), ".cache", "create-express-type");
  const cacheFile = path.join(cacheDir, `template-v${pkg.version}.zip`);

  if (existsSync(cacheFile)) {
    return await readFile(cacheFile);
  }

  const response = await fetch(REPO_ZIP_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to download template (HTTP ${response.status}: ${response.statusText})`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuffer);

  try {
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    await writeFile(cacheFile, zipBuffer);
  } catch {
    // Ignore cache write errors (e.g. read-only filesystem)
  }

  return zipBuffer;
}

/** Extracts a subdirectory from a zip buffer into a destination folder */
async function extractZip(
  zipBuffer: Buffer,
  destination: string,
  subdir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();

      zipfile.on("entry", (entry) => {
        const entryPath = entry.fileName as string;
        const isDirectory = entryPath.endsWith("/");

        if (entryPath.startsWith(subdir) && !isDirectory) {
          const relativePath = entryPath.substring(subdir.length);
          if (!relativePath) {
            zipfile.readEntry();
            return;
          }

          const newPath = path.join(destination, relativePath);
          const parentDir = path.dirname(newPath);

          if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
          }

          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr) return reject(streamErr);
            const writeStream = createWriteStream(newPath);
            readStream.pipe(writeStream);
            writeStream.on("finish", () => zipfile.readEntry());
            writeStream.on("error", reject);
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => resolve());
      zipfile.on("error", (e: Error) => reject(e));
    });
  });
}

/** Initializes git repository in destination directory */
function initGitRepo(destination: string): boolean {
  try {
    execSync("git init", { cwd: destination, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Makes an initial git commit in destination directory */
function makeInitialCommit(destination: string, version: string): boolean {
  try {
    execSync("git add .", { cwd: destination, stdio: "ignore" });
    execSync(
      `git commit --no-verify -m "chore: scaffold project from create-express-type v${version}"`,
      { cwd: destination, stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

/** Generates personalized README.md file */
async function generateReadme(
  destination: string,
  projectName: string,
  db: DatabaseChoice,
  packageManager: string
): Promise<void> {
  const dbName =
    db === "prisma"
      ? "PostgreSQL + Prisma"
      : db === "mongoose"
      ? "MongoDB + Mongoose"
      : "None (Pure Express)";

  const dbCommands =
    db === "prisma"
      ? `### Database Scripts (Prisma)
\`\`\`bash
${packageManager} run db:push     # Push schema to database
${packageManager} run db:migrate  # Run migration (dev)
${packageManager} run db:generate # Generate Prisma client
${packageManager} run db:studio   # Open Prisma Studio UI
\`\`\`
`
      : db === "mongoose"
      ? `### Database Setup (MongoDB)
Ensure MongoDB is running locally or provide a remote \`MONGODB_URI\` in your \`.env\` file.
`
      : "";

  const readmeContent = `# ${projectName}

> Generated with [create-express-type](https://github.com/Be1newinner/create-express-type) v${pkg.version}

Production-ready TypeScript + Express.js backend API.

## 🛠️ Stack

- **Framework**: Express.js 5 + TypeScript
- **Database**: ${dbName}
- **Logger**: Pino (structured JSON in prod, pretty in dev)
- **Security**: Helmet, CORS, Express Rate Limit
- **Validation**: Zod (fail-fast environment & request validation)
- **Code Quality**: ESLint, Prettier, Husky, lint-staged
- **Testing**: Vitest + Supertest

---

## 🚀 Getting Started

### 1. Environment Setup

\`\`\`bash
cp .env.example .env
\`\`\`

Fill in your secrets in \`.env\`.

### 2. Run Development Server

\`\`\`bash
${packageManager} run dev
\`\`\`

The server will start at \`http://localhost:8005\`.

${dbCommands}

---

## 📜 Available Scripts

| Script | Description |
| --- | --- |
| \`${packageManager} run dev\` | Start dev server with hot reload |
| \`${packageManager} run build\` | Build production bundle |
| \`${packageManager} run start\` | Start production server |
| \`${packageManager} run check\` | Run TypeScript type check |
| \`${packageManager} run lint\` | Run ESLint |
| \`${packageManager} run test\` | Run Vitest tests |

---

## 🌐 API Endpoints

- \`GET /health\` — Server health status & uptime
- \`POST /api/v1/auth/register\` — Register new user
- \`POST /api/v1/auth/login\` — Login user (JWT token)
- \`GET /api/v1/products\` — List products
- \`GET /api/v1/products/:id\` — Get product by ID
`;

  await writeFile(path.join(destination, "README.md"), readmeContent, "utf-8");
}

/**
 * Updates package.json in the scaffolded project:
 * - Sets the project name and version
 * - Injects database-specific dependencies and npm scripts
 */
async function updatePackageJson(
  destination: string,
  projectName: string,
  db: DatabaseChoice
): Promise<void> {
  const pkgPath = path.join(destination, "package.json");
  if (!existsSync(pkgPath)) return;

  const raw = await readFile(pkgPath, "utf-8");
  const parsed = JSON.parse(raw) as {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  parsed.name = projectName;
  parsed.version = "0.1.0";

  if (db === "prisma") {
    parsed.dependencies = { ...parsed.dependencies, "@prisma/client": "^6.0.0" };
    parsed.devDependencies = { ...parsed.devDependencies, prisma: "^6.0.0" };
    parsed.scripts = {
      ...parsed.scripts,
      "db:generate": "prisma generate",
      "db:push":     "prisma db push",
      "db:migrate":  "prisma migrate dev",
      "db:studio":   "prisma studio",
    };
  } else if (db === "mongoose") {
    parsed.dependencies = { ...parsed.dependencies, mongoose: "^8.0.0" };
  }

  await writeFile(pkgPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
}

/**
 * Injects database-specific files and config into the scaffolded project.
 */
async function injectDatabase(destination: string, db: DatabaseChoice): Promise<void> {
  const srcIndex = path.join(destination, "src", "index.ts");
  const srcEnv   = path.join(destination, "src", "config", "env.ts");
  const envEx    = path.join(destination, ".env.example");

  let indexContent = await readFile(srcIndex, "utf-8");

  // ── None: scrub the markers and return ─────────────────────────────────────
  if (db === "none") {
    indexContent = indexContent
      .replace(/^\/\/ __DB_IMPORT__\n/m,       "")
      .replace(/^\/\/ __DB_CONNECT__\n/m,      "")
      .replace(/^ *\/\/ __DB_DISCONNECT__\n/m, "")
      .replace(/^ *\/\/ __DB_HEALTH_CHECK__\n/m, "")
      .replace(/^ *\/__DB_HEALTH_RESULT__\n/m, "");
    await writeFile(srcIndex, indexContent, "utf-8");
    return;
  }

  // ── Shared setup for prisma / mongoose ────────────────────────────────────
  const libDir = path.join(destination, "src", "lib");
  if (!existsSync(libDir)) mkdirSync(libDir, { recursive: true });

  let envContent   = await readFile(srcEnv, "utf-8");
  let envExContent = await readFile(envEx,  "utf-8");

  // ── Prisma ─────────────────────────────────────────────────────────────────
  if (db === "prisma") {
    // Create new files
    const prismaDir = path.join(destination, "prisma");
    if (!existsSync(prismaDir)) mkdirSync(prismaDir, { recursive: true });
    writeFileSync(path.join(prismaDir, "schema.prisma"), PRISMA_SCHEMA, "utf-8");
    writeFileSync(path.join(libDir, "prisma.ts"),        PRISMA_LIB,    "utf-8");

    // src/index.ts — inject import, remove connect marker, inject disconnect, inject health check
    indexContent = indexContent
      .replace(
        "// __DB_IMPORT__",
        `import { prisma } from "@/lib/prisma.js";`
      )
      .replace(/^\/\/ __DB_CONNECT__\n/m, "") // Prisma uses lazy connection
      .replace(
        /^ *\/\/ __DB_DISCONNECT__/m,
        `      await prisma.$disconnect();\n      logger.info("🔌 Prisma disconnected.");`
      )
      .replace(
        "// __DB_HEALTH_CHECK__",
        `    let dbStatus = "unknown";\n    try {\n      await prisma.$queryRaw\`SELECT 1\`;\n      dbStatus = "connected";\n    } catch {\n      dbStatus = "error";\n    }`
      )
      .replace(
        "// __DB_HEALTH_RESULT__",
        `db: dbStatus,`
      );

    // src/config/env.ts — uncomment DATABASE_URL
    envContent = envContent.replace(
      `  // DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),`,
      `  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),`
    );

    // .env.example — uncomment DATABASE_URL
    envExContent = envExContent.replace(
      "# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb",
      "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb"
    );

  // ── Mongoose ───────────────────────────────────────────────────────────────
  } else if (db === "mongoose") {
    // Create new files
    writeFileSync(path.join(libDir, "mongoose.ts"), MONGOOSE_LIB, "utf-8");

    // src/index.ts — inject import, await connectDB before listen, inject disconnect, inject health check
    indexContent = indexContent
      .replace(
        "// __DB_IMPORT__",
        `import { connectDB, disconnectDB, getDbStatus } from "@/lib/mongoose.js";`
      )
      .replace("// __DB_CONNECT__", "await connectDB(); // top-level await (ESM)")
      .replace(
        /^ *\/\/ __DB_DISCONNECT__/m,
        "      await disconnectDB();"
      )
      .replace(
        "// __DB_HEALTH_CHECK__",
        `    const dbStatus = getDbStatus();`
      )
      .replace(
        "// __DB_HEALTH_RESULT__",
        `db: dbStatus,`
      );

    // src/config/env.ts — add MONGODB_URI instead of DATABASE_URL
    envContent = envContent.replace(
      `  // DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),`,
      `  MONGODB_URI: z.string().url("MONGODB_URI must be a valid MongoDB connection URL"),`
    );

    // .env.example — swap commented DATABASE_URL for active MONGODB_URI
    envExContent = envExContent
      .replace(
        /^# ─── Database .*$/m,
        "# ─── Database ─────────────────────────────────────────────────────────────────"
      )
      .replace(
        "# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb",
        "MONGODB_URI=mongodb://localhost:27017/mydb"
      );
  }

  // Write all modified files back
  await writeFile(srcIndex, indexContent, "utf-8");
  await writeFile(srcEnv,   envContent,   "utf-8");
  await writeFile(envEx,    envExContent, "utf-8");
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(`create-express-type v${pkg.version}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  create-express-type v${pkg.version}

  A CLI to scaffold a production-ready TypeScript + Express.js project.

  Usage:
    npx create-express-type [project-name] [options]

  Options:
    --version, -v   Print the version number
    --help, -h      Show this help message
    --yes, -y       Skip interactive prompts and use defaults

  Examples:
    npx create-express-type                  # Interactive mode
    npx create-express-type my-api           # Scaffold with given name
    npx create-express-type my-api --yes     # Non-interactive mode
  `);
  process.exit(0);
}

async function main(): Promise<void> {
  console.log("");
  intro("  🚀  create-express-type — TypeScript + Express Scaffolding  ");

  const useDefaults = args.includes("--yes") || args.includes("-y");

  // ── Step 1: Project Name ───────────────────────────────────────────────────
  let projectName = args.find((a) => !a.startsWith("--") && !a.startsWith("-"));

  if (!projectName) {
    if (useDefaults) {
      log.error(
        "Project name is required when using --yes flag (e.g. npx create-express-type my-api --yes)"
      );
      process.exit(1);
    }

    const nameInput = await text({
      message: "What is your project name?",
      placeholder: "my-express-api",
      validate: (value) => {
        if (!value || value.trim() === "") return "Project name cannot be empty";
        if (!isValidPackageName(value))
          return "Use only lowercase letters, numbers, and hyphens (e.g. my-api)";
        if (existsSync(path.resolve(process.cwd(), value)))
          return `Directory "${value}" already exists. Choose a different name.`;
      },
    });

    if (isCancel(nameInput)) {
      cancel("Cancelled. No files were created.");
      process.exit(0);
    }
    projectName = nameInput as string;
  } else {
    if (!isValidPackageName(projectName)) {
      log.error(
        'Invalid project name. Use only lowercase letters, numbers, and hyphens (e.g. "my-api").'
      );
      process.exit(1);
    }
    if (existsSync(path.resolve(process.cwd(), projectName))) {
      log.error(`Directory "${projectName}" already exists. Choose a different name.`);
      process.exit(1);
    }
  }

  const destination = path.resolve(process.cwd(), projectName);

  // ── Step 2: Package Manager ────────────────────────────────────────────────
  const available = detectAvailablePackageManagers();
  let packageManager = "npm";

  if (!useDefaults && available.length > 1) {
    const pmChoice = await select({
      message: "Which package manager would you like to use?",
      options: available.map((pm) => ({
        value: pm,
        label: pm,
        hint: pm === "pnpm" ? "fast, disk-efficient" : pm === "bun" ? "ultra-fast" : undefined,
      })),
    });

    if (isCancel(pmChoice)) {
      cancel("Cancelled. No files were created.");
      process.exit(0);
    }
    packageManager = pmChoice as string;
  }

  // ── Step 3: Database ───────────────────────────────────────────────────────
  let db: DatabaseChoice = "none";
  if (!useDefaults) {
    const dbChoice = await select({
      message: "Which database would you like to use?",
      options: [
        { value: "none",     label: "None",                hint: "pure Express, no database" },
        { value: "prisma",   label: "PostgreSQL + Prisma", hint: "type-safe ORM with migrations" },
        { value: "mongoose", label: "MongoDB + Mongoose",  hint: "schema-based ODM for MongoDB" },
      ],
    });

    if (isCancel(dbChoice)) {
      cancel("Cancelled. No files were created.");
      process.exit(0);
    }
    db = dbChoice as DatabaseChoice;
  }

  // ── Step 4: Auto-install ───────────────────────────────────────────────────
  let autoInstall = true;
  if (!useDefaults) {
    const autoInstallChoice = await confirm({
      message: `Install dependencies now using ${packageManager}?`,
      initialValue: true,
    });

    if (isCancel(autoInstallChoice)) {
      cancel("Cancelled. No files were created.");
      process.exit(0);
    }
    autoInstall = autoInstallChoice as boolean;
  }

  // ── Step 5: Download & Extract ─────────────────────────────────────────────
  const s = spinner();
  s.start("Preparing template...");

  try {
    await mkdir(destination, { recursive: true });

    const zipBuffer = await getTemplateZip();

    s.message("Extracting files...");
    await extractZip(zipBuffer, destination, REPO_SUBDIR);

    s.message("Configuring project & generating docs...");
    await injectDatabase(destination, db);
    await updatePackageJson(destination, projectName as string, db);
    await generateReadme(destination, projectName as string, db, packageManager);

    s.message("Initializing git repository...");
    const hasGit = initGitRepo(destination);

    s.stop(`✅ Project "${projectName}" created at ./${projectName}`);

    // ── Step 6: Install dependencies ───────────────────────────────────────
    if (autoInstall) {
      const installSpinner = spinner();
      installSpinner.start(`Installing dependencies with ${packageManager}...`);
      try {
        execSync(`${packageManager} install`, { cwd: destination, stdio: "pipe" });
        installSpinner.stop("✅ Dependencies installed & git hooks prepared!");

        // Auto-generate Prisma client after install
        if (db === "prisma") {
          const genSpinner = spinner();
          genSpinner.start("Generating Prisma client...");
          try {
            execSync(`${packageManager} run db:generate`, {
              cwd: destination,
              stdio: "pipe",
            });
            genSpinner.stop("✅ Prisma client generated!");
          } catch {
            genSpinner.stop(
              "⚠️  Prisma client generation failed — run `npm run db:generate` manually after setting DATABASE_URL."
            );
          }
        }
      } catch {
        installSpinner.stop(
          "⚠️  Auto-install failed. Run the install command manually in the project directory."
        );
      }
    }

    // Initial git commit after setup & install
    if (hasGit) {
      makeInitialCommit(destination, pkg.version);
    }

    // ── Step 7: Next Steps ─────────────────────────────────────────────────
    const installCmd = autoInstall ? "" : `\n  ${packageManager} install`;

    const dbNextSteps: Record<DatabaseChoice, string> = {
      none: "",
      prisma: [
        "",
        "  📦  Prisma — next steps:",
        "  Fill in DATABASE_URL in .env, then:",
        `  ${packageManager} run db:push      # sync schema → PostgreSQL`,
        `  ${packageManager} run db:studio    # open Prisma Studio UI`,
      ].join("\n"),
      mongoose: "\n  🍃  Make sure MongoDB is running before starting the dev server.",
    };

    outro(
      [
        `  Project ready! Here's what to do next:\n`,
        `  cd ${projectName}`,
        installCmd,
        `  cp .env.example .env   # Add your secrets`,
        `  ${packageManager} run dev          # Start the dev server`,
        dbNextSteps[db],
        `\n  🌐  Docs: https://github.com/Be1newinner/create-express-type`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  } catch (error) {
    s.stop("❌ Failed to create project.");
    log.error(error instanceof Error ? error.message : String(error));

    // Clean up partial output
    try {
      if (existsSync(destination)) {
        rmSync(destination, { recursive: true, force: true });
        log.info("Cleaned up partially created directory.");
      }
    } catch {
      // ignore cleanup errors
    }

    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
