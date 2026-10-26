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
import { cpSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

// ─── Constants ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf-8")) as {
  version: string;
};

// Templates ship inside the npm package, so the scaffolded project always matches this CLI version
const TEMPLATES_DIR = path.join(__dirname, "..", "packages");
const BASE_TEMPLATE_DIR = path.join(TEMPLATES_DIR, "express-type");
const OVERLAYS_DIR = path.join(TEMPLATES_DIR, "overlays");

/** Never copied into a new project (local dev artifacts inside the template folders) */
const SKIPPED_NAMES = new Set([
  "node_modules",
  "dist",
  "coverage",
  "package-lock.json",
  ".env",
  "overlay.json",
]);
const SKIPPED_PATHS = new Set([path.join(".husky", "_")]);

/**
 * Dependencies whose install scripts must run (native bindings, binaries) — pnpm 10+
 * blocks install scripts unless they're listed. Overlays add their own via overlay.json.
 */
const BUILD_DEPENDENCIES = ["bcrypt", "esbuild"];
/** Dependencies whose install scripts are explicitly skipped (telemetry from swagger-ui-dist) */
const IGNORED_BUILD_DEPENDENCIES = ["@scarf/scarf"];

// ─── Types ────────────────────────────────────────────────────────────────────

const DATABASES = ["none", "prisma", "drizzle", "mongoose"] as const;
type DatabaseChoice = (typeof DATABASES)[number];

const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const DATABASE_INFO: Record<DatabaseChoice, { label: string; hint: string }> = {
  none: { label: "None", hint: "pure Express, no database" },
  prisma: { label: "PostgreSQL + Prisma", hint: "type-safe ORM with migrations" },
  drizzle: { label: "PostgreSQL + Drizzle", hint: "lightweight, SQL-like TypeScript ORM" },
  mongoose: { label: "MongoDB + Mongoose", hint: "schema-based ODM for MongoDB" },
};

/** overlay.json — what an overlay adds on top of the base template */
interface OverlayManifest {
  extends?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  env?: { name: string; schema: string; example: string }[];
  buildDependencies?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Validates that a string is a valid npm package name */
function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

/** Detects which package managers are available on the system, with their versions */
function detectAvailablePackageManagers(): Map<PackageManager, string> {
  const found = new Map<PackageManager, string>();
  for (const pm of PACKAGE_MANAGERS) {
    try {
      const version = execSync(`${pm} --version`, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
      found.set(pm, version);
    } catch {
      // not installed
    }
  }
  return found;
}

/** The package manager that launched this CLI (e.g. `pnpm create express-type`), if known */
function detectInvokingPackageManager(): PackageManager | undefined {
  const agent = process.env.npm_config_user_agent ?? "";
  return PACKAGE_MANAGERS.find((pm) => agent.startsWith(`${pm}/`));
}

function copyDir(source: string, destination: string): void {
  cpSync(source, destination, {
    recursive: true,
    force: true,
    filter: (src) =>
      !SKIPPED_NAMES.has(path.basename(src)) && !SKIPPED_PATHS.has(path.relative(source, src)),
  });
}

const emptyManifest = (): Required<OverlayManifest> => ({
  extends: [],
  dependencies: {},
  devDependencies: {},
  scripts: {},
  env: [],
  buildDependencies: [],
});

/**
 * Resolves an overlay and the overlays it extends (depth-first, dependencies first)
 * into the list of directories to copy and their merged manifest.
 */
function resolveOverlay(name: string): { dirs: string[]; manifest: Required<OverlayManifest> } {
  const dirs: string[] = [];
  const manifest = emptyManifest();

  const visit = (overlay: string): void => {
    const dir = path.join(OVERLAYS_DIR, overlay);
    if (!existsSync(dir)) throw new Error(`Template overlay "${overlay}" is missing.`);
    if (dirs.includes(dir)) return;

    const manifestPath = path.join(dir, "overlay.json");
    const own: OverlayManifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf-8"))
      : {};

    own.extends?.forEach(visit);
    dirs.push(dir);
    Object.assign(manifest.dependencies, own.dependencies);
    Object.assign(manifest.devDependencies, own.devDependencies);
    Object.assign(manifest.scripts, own.scripts);
    manifest.env.push(...(own.env ?? []));
    manifest.buildDependencies.push(...(own.buildDependencies ?? []));
  };

  visit(name);
  return { dirs, manifest };
}

const sortKeys = (obj: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Updates package.json in the scaffolded project:
 * - Sets the project name, version and (for pnpm/yarn) the packageManager field
 * - Merges in the database overlay's dependencies and scripts
 */
function updatePackageJson(
  destination: string,
  projectName: string,
  manifest: Required<OverlayManifest>,
  packageManager: PackageManager,
  pmVersion: string | undefined
): void {
  const pkgPath = path.join(destination, "package.json");
  const parsed = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    name?: string;
    version?: string;
    packageManager?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  parsed.name = projectName;
  parsed.version = "0.1.0";
  // Pins the version Corepack uses (locally and in the Dockerfile)
  if ((packageManager === "pnpm" || packageManager === "yarn") && pmVersion) {
    parsed.packageManager = `${packageManager}@${pmVersion}`;
  }
  parsed.scripts = { ...parsed.scripts, ...manifest.scripts };
  parsed.dependencies = sortKeys({ ...parsed.dependencies, ...manifest.dependencies });
  parsed.devDependencies = sortKeys({ ...parsed.devDependencies, ...manifest.devDependencies });

  writeFileSync(pkgPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
}

/**
 * pnpm 10+ refuses to run dependency install scripts unless they're approved
 * (pnpm 11 fails the install outright). Pre-approve the ones this project needs.
 *
 * @returns extra config files the Dockerfile must copy before installing
 */
function configurePnpmBuilds(
  destination: string,
  pmVersion: string | undefined,
  buildDependencies: string[]
): string[] {
  const major = Number((pmVersion ?? "").split(".")[0]);
  const allowed = [...new Set([...BUILD_DEPENDENCIES, ...buildDependencies])].sort();

  if (major >= 11) {
    const entries = [
      ...allowed.map((name) => `  '${name}': true`),
      ...IGNORED_BUILD_DEPENDENCIES.map((name) => `  '${name}': false`),
    ];
    writeFileSync(
      path.join(destination, "pnpm-workspace.yaml"),
      `allowBuilds:\n${entries.join("\n")}\n`,
      "utf-8"
    );
    return ["pnpm-workspace.yaml"];
  }

  if (major === 10) {
    const pkgPath = path.join(destination, "package.json");
    const parsed = JSON.parse(readFileSync(pkgPath, "utf-8"));
    parsed.pnpm = {
      onlyBuiltDependencies: allowed,
      ignoredBuiltDependencies: IGNORED_BUILD_DEPENDENCIES,
    };
    writeFileSync(pkgPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
  }

  return [];
}

/** Adds the overlay's env vars to src/config/env.ts and .env.example */
function injectEnvVars(destination: string, vars: Required<OverlayManifest>["env"]): void {
  if (vars.length === 0) return;

  const envTsPath = path.join(destination, "src", "config", "env.ts");
  const envTsLines = readFileSync(envTsPath, "utf-8").split("\n");
  const anchor = envTsLines.findIndex((line) =>
    line.trimStart().startsWith("// ── Add your own vars below")
  );
  if (anchor === -1) {
    throw new Error("Could not find the env var anchor comment in src/config/env.ts.");
  }
  const indent = envTsLines[anchor].match(/^\s*/)?.[0] ?? "";
  envTsLines.splice(
    anchor,
    0,
    `${indent}// Database`,
    ...vars.map((v) => `${indent}${v.name}: ${v.schema},`),
    ""
  );
  writeFileSync(envTsPath, envTsLines.join("\n"), "utf-8");

  const envExamplePath = path.join(destination, ".env.example");
  const envExample = readFileSync(envExamplePath, "utf-8").trimEnd();
  const exampleLines = [
    "# ─── Database ─────────────────────────────────────────────────────────────────",
    ...vars.map((v) => `${v.name}=${v.example}`),
  ];
  writeFileSync(envExamplePath, `${envExample}\n\n${exampleLines.join("\n")}\n`, "utf-8");
}

/**
 * The template Dockerfile uses npm. For other package managers, swap in their
 * setup, lockfile and install commands.
 */
function configureDockerfile(
  destination: string,
  packageManager: PackageManager,
  pmVersion: string | undefined,
  extraInstallFiles: string[]
): void {
  if (packageManager === "npm") return;

  const [major = 0, minor = 0] = (pmVersion ?? "").split(".").map(Number);
  const commands = {
    pnpm: {
      setup: "RUN corepack enable",
      lockfile: "pnpm-lock.yaml",
      install: "pnpm install --frozen-lockfile",
      installProd: "pnpm install --frozen-lockfile --prod",
    },
    yarn:
      major >= 2
        ? {
            setup: "RUN corepack enable",
            lockfile: "yarn.lock",
            install: "yarn install --immutable",
            installProd: "yarn workspaces focus --all --production",
          }
        : {
            setup: "RUN corepack enable",
            lockfile: "yarn.lock",
            install: "yarn install --frozen-lockfile",
            installProd: "yarn install --frozen-lockfile --production",
          },
    bun: {
      setup: `RUN npm install -g bun@${pmVersion ?? "latest"}`,
      lockfile: major > 1 || (major === 1 && minor >= 2) ? "bun.lock" : "bun.lockb",
      install: "bun install --frozen-lockfile",
      installProd: "bun install --frozen-lockfile --production",
    },
  }[packageManager];

  const replacements: Record<string, string> = {
    "ENV HUSKY=0": `ENV HUSKY=0\n${commands.setup}`,
    "COPY package.json package-lock.json ./": `COPY ${["package.json", commands.lockfile, ...extraInstallFiles].join(" ")} ./`,
    "RUN npm ci": `RUN ${commands.install}`,
    "RUN npm ci --omit=dev": `RUN ${commands.installProd}`,
    "RUN npm run build": `RUN ${packageManager} run build`,
  };

  const dockerfilePath = path.join(destination, "Dockerfile");
  const lines = readFileSync(dockerfilePath, "utf-8").split("\n");
  const unmatched = new Set(Object.keys(replacements));
  const updated = lines.map((line) => {
    const replacement = replacements[line];
    if (replacement === undefined) return line;
    unmatched.delete(line);
    return replacement;
  });
  if (unmatched.size > 0) {
    throw new Error(`Dockerfile is missing expected lines: ${[...unmatched].join(", ")}`);
  }
  writeFileSync(dockerfilePath, updated.join("\n"), "utf-8");
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

/** Last lines of a failed command's output, for error messages */
function commandOutputTail(error: unknown, lines = 15): string {
  const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
  const output = `${stdout?.toString() ?? ""}\n${stderr?.toString() ?? ""}`.trim();
  return output.split("\n").slice(-lines).join("\n");
}

/** Generates personalized README.md file */
function generateReadme(
  destination: string,
  projectName: string,
  db: DatabaseChoice,
  packageManager: PackageManager
): void {
  const run = `${packageManager} run`;

  const dbSection: Record<DatabaseChoice, string> = {
    none: "",
    prisma: `### Database (PostgreSQL + Prisma)

Start PostgreSQL with \`docker compose up -d postgres\` (or point \`DATABASE_URL\` at your own), then:

\`\`\`bash
${run} db:push      # Sync prisma/schema.prisma → database
${run} db:migrate   # Create & apply a migration (dev)
${run} db:generate  # Regenerate the Prisma client
${run} db:studio    # Open Prisma Studio
\`\`\`
`,
    drizzle: `### Database (PostgreSQL + Drizzle)

Start PostgreSQL with \`docker compose up -d postgres\` (or point \`DATABASE_URL\` at your own), then:

\`\`\`bash
${run} db:push      # Sync src/db/schema.ts → database
${run} db:generate  # Generate SQL migrations into ./drizzle
${run} db:migrate   # Apply migrations
${run} db:studio    # Open Drizzle Studio
\`\`\`
`,
    mongoose: `### Database (MongoDB + Mongoose)

Start MongoDB with \`docker compose up -d mongo\`, or set \`MONGODB_URI\` in \`.env\` to your own instance.
`,
  };

  const readmeContent = `# ${projectName}

> Generated with [create-express-type](https://github.com/Be1newinner/create-express-type) v${pkg.version}

Production-ready TypeScript + Express.js backend API.

## 🛠️ Stack

- **Framework**: Express.js 5 + TypeScript
- **Database**: ${DATABASE_INFO[db].label}
- **Validation**: Zod — env vars at startup, requests via the \`validate()\` middleware
- **API Docs**: OpenAPI 3 generated from the Zod schemas, Swagger UI at \`/docs\`
- **Logger**: Pino (structured JSON in prod, pretty in dev)
- **Security**: Helmet, CORS, Express Rate Limit
- **Code Quality**: ESLint, Prettier, Husky, lint-staged
- **Testing**: Vitest + Supertest
- **Deployment**: Multi-stage Dockerfile + docker-compose

---

## 🚀 Getting Started

\`\`\`bash
cp .env.example .env   # then fill in your secrets
${run} dev
\`\`\`

- API: \`http://localhost:8005/api/v1\`
- Docs: \`http://localhost:8005/docs\`
- Health: \`http://localhost:8005/health\`

${dbSection[db]}
### Docker

\`\`\`bash
docker compose up --build
\`\`\`

---

## 🧩 Adding a Feature

\`\`\`bash
${run} gen:feature${packageManager === "npm" ? " --" : ""} order
\`\`\`

Creates \`src/features/order/\` (schema, model, service, controller, routes with API docs),
a test in \`__tests__/order.test.ts\`, and mounts it at \`/api/v1/orders\`.

---

## 📜 Available Scripts

| Script | Description |
| --- | --- |
| \`${run} dev\` | Start dev server with hot reload |
| \`${run} build\` | Build production bundle |
| \`${run} start\` | Start production server |
| \`${run} check\` | Run TypeScript type check |
| \`${run} lint\` | Run ESLint |
| \`${run} test\` | Run Vitest tests |
| \`${run} gen:feature\` | Scaffold a new feature module |

---

## 🌐 API Endpoints

See \`/docs\` for the full, interactive reference.

- \`GET /health\` — Server health status & uptime
- \`POST /api/v1/auth/register\` — Register new user
- \`POST /api/v1/auth/login\` — Login user (JWT token)
- \`GET /api/v1/auth/profile\` — Current user (requires Bearer token)
- \`GET /api/v1/products\` — List products
- \`GET /api/v1/products/:id\` — Get product by ID
`;

  writeFileSync(path.join(destination, "README.md"), readmeContent, "utf-8");
}

// ─── CLI Arguments ────────────────────────────────────────────────────────────

const HELP = `
  create-express-type v${pkg.version}

  A CLI to scaffold a production-ready TypeScript + Express.js project.

  Usage:
    npx create-express-type [project-name] [options]

  Options:
    --db <name>          Database: ${DATABASES.join(" | ")}
    --pm <name>          Package manager: ${PACKAGE_MANAGERS.join(" | ")}
    --install            Install dependencies (default)
    --no-install         Skip installing dependencies
    --git                Initialize a git repository (default)
    --no-git             Skip git init and the initial commit
    --yes, -y            Use defaults for anything not passed as a flag
    --version, -v        Print the version number
    --help, -h           Show this help message

  Examples:
    npx create-express-type                                   # Interactive mode
    npx create-express-type my-api                            # Scaffold with given name
    npx create-express-type my-api --yes                      # All defaults
    npx create-express-type my-api --db drizzle --pm pnpm -y  # Fully scripted
`;

function parseCliArgs() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        db: { type: "string" },
        pm: { type: "string" },
        install: { type: "boolean" },
        "no-install": { type: "boolean" },
        git: { type: "boolean" },
        "no-git": { type: "boolean" },
        yes: { type: "boolean", short: "y" },
        version: { type: "boolean", short: "v" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    console.error(`\n  ${error instanceof Error ? error.message : String(error)}`);
    console.error("  Run with --help to see the available options.\n");
    process.exit(1);
  }
}

/** Resolves a --flag / --no-flag pair to true, false, or undefined when neither is passed */
function booleanFlag(values: Record<string, unknown>, name: string): boolean | undefined {
  const on = values[name] === true;
  const off = values[`no-${name}`] === true;
  if (on && off) {
    console.error(`\n  --${name} and --no-${name} can't be used together.\n`);
    process.exit(1);
  }
  return on ? true : off ? false : undefined;
}

function exitWithError(message: string): never {
  log.error(message);
  process.exit(1);
}

function exitIfCancelled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled. No files were created.");
    process.exit(0);
  }
  return value as T;
}

const { values: flags, positionals } = parseCliArgs();

if (flags.version) {
  console.log(`create-express-type v${pkg.version}`);
  process.exit(0);
}

if (flags.help) {
  console.log(HELP);
  process.exit(0);
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("");
  intro("  🚀  create-express-type — TypeScript + Express Scaffolding  ");

  const useDefaults = flags.yes === true;
  const installFlag = booleanFlag(flags, "install");
  const gitFlag = booleanFlag(flags, "git");

  if (positionals.length > 1) {
    exitWithError(`Expected a single project name, got: ${positionals.join(" ")}`);
  }
  if (flags.db !== undefined && !DATABASES.includes(flags.db as DatabaseChoice)) {
    exitWithError(`Unknown --db "${flags.db}". Choose one of: ${DATABASES.join(", ")}`);
  }
  if (flags.pm !== undefined && !PACKAGE_MANAGERS.includes(flags.pm as PackageManager)) {
    exitWithError(`Unknown --pm "${flags.pm}". Choose one of: ${PACKAGE_MANAGERS.join(", ")}`);
  }

  // ── Step 1: Project Name ───────────────────────────────────────────────────
  let projectName = positionals[0];

  if (!projectName) {
    if (useDefaults) {
      exitWithError(
        "Project name is required when using --yes flag (e.g. npx create-express-type my-api --yes)"
      );
    }

    projectName = exitIfCancelled(
      await text({
        message: "What is your project name?",
        placeholder: "my-express-api",
        validate: (value) => {
          if (!value || value.trim() === "") return "Project name cannot be empty";
          if (!isValidPackageName(value))
            return "Use only lowercase letters, numbers, and hyphens (e.g. my-api)";
          if (existsSync(path.resolve(process.cwd(), value)))
            return `Directory "${value}" already exists. Choose a different name.`;
        },
      })
    );
  } else {
    if (!isValidPackageName(projectName)) {
      exitWithError(
        'Invalid project name. Use only lowercase letters, numbers, and hyphens (e.g. "my-api").'
      );
    }
    if (existsSync(path.resolve(process.cwd(), projectName))) {
      exitWithError(`Directory "${projectName}" already exists. Choose a different name.`);
    }
  }

  const destination = path.resolve(process.cwd(), projectName);

  // ── Step 2: Package Manager ────────────────────────────────────────────────
  const available = detectAvailablePackageManagers();
  const invoking = detectInvokingPackageManager();
  const defaultPm: PackageManager = invoking && available.has(invoking) ? invoking : "npm";
  let packageManager = flags.pm as PackageManager | undefined;

  if (packageManager && !available.has(packageManager)) {
    exitWithError(`--pm ${packageManager} was requested, but ${packageManager} isn't installed.`);
  }

  if (!packageManager) {
    if (useDefaults || available.size <= 1) {
      packageManager = defaultPm;
    } else {
      packageManager = exitIfCancelled(
        await select({
          message: "Which package manager would you like to use?",
          initialValue: defaultPm,
          options: [...available.keys()].map((pm) => ({
            value: pm,
            label: pm,
            hint: pm === "pnpm" ? "fast, disk-efficient" : pm === "bun" ? "ultra-fast" : undefined,
          })),
        })
      );
    }
  }
  const pmVersion = available.get(packageManager);

  // ── Step 3: Database ───────────────────────────────────────────────────────
  let db = flags.db as DatabaseChoice | undefined;
  if (!db) {
    db = useDefaults
      ? "none"
      : exitIfCancelled(
          await select({
            message: "Which database would you like to use?",
            options: DATABASES.map((value) => ({ value, ...DATABASE_INFO[value] })),
          })
        );
  }

  // ── Step 4: Auto-install ───────────────────────────────────────────────────
  let autoInstall = installFlag;
  if (autoInstall === undefined) {
    autoInstall = useDefaults
      ? true
      : exitIfCancelled(
          await confirm({
            message: `Install dependencies now using ${packageManager}?`,
            initialValue: true,
          })
        );
  }

  const useGit = gitFlag ?? true;

  // ── Step 5: Copy & Configure ───────────────────────────────────────────────
  const s = spinner();
  s.start("Copying template...");

  try {
    copyDir(BASE_TEMPLATE_DIR, destination);
    // npm strips .gitignore files when publishing, so the template ships it as _gitignore
    renameSync(path.join(destination, "_gitignore"), path.join(destination, ".gitignore"));

    s.message("Configuring project & generating docs...");
    const overlay = db === "none" ? { dirs: [], manifest: emptyManifest() } : resolveOverlay(db);
    overlay.dirs.forEach((dir) => copyDir(dir, destination));
    injectEnvVars(destination, overlay.manifest.env);
    updatePackageJson(destination, projectName, overlay.manifest, packageManager, pmVersion);
    const extraInstallFiles =
      packageManager === "pnpm"
        ? configurePnpmBuilds(destination, pmVersion, overlay.manifest.buildDependencies)
        : [];
    configureDockerfile(destination, packageManager, pmVersion, extraInstallFiles);
    generateReadme(destination, projectName, db, packageManager);

    // Before install, so Husky's prepare script can install the git hooks
    const hasGit = useGit && initGitRepo(destination);

    s.stop(`✅ Project "${projectName}" created at ./${projectName}`);

    // ── Step 6: Install dependencies ───────────────────────────────────────
    if (autoInstall) {
      const installSpinner = spinner();
      installSpinner.start(`Installing dependencies with ${packageManager}...`);
      try {
        execSync(`${packageManager} install`, { cwd: destination, stdio: "pipe" });
        installSpinner.stop(
          db === "prisma"
            ? "✅ Dependencies installed & Prisma client generated!"
            : "✅ Dependencies installed & git hooks prepared!"
        );
      } catch (error) {
        installSpinner.stop("⚠️  Auto-install failed. Run the install command manually.");
        log.warn(commandOutputTail(error));
      }
    }

    // Initial git commit after setup & install (includes the lockfile)
    if (hasGit && !makeInitialCommit(destination, pkg.version)) {
      log.warn(
        "Couldn't create the initial git commit (is git user.name/user.email set?). Commit manually."
      );
    }

    // ── Step 7: Next Steps ─────────────────────────────────────────────────
    const run = `${packageManager} run`;
    const dbNextSteps: Record<DatabaseChoice, string> = {
      none: "",
      prisma: [
        "",
        "  🐘  PostgreSQL + Prisma:",
        "  docker compose up -d postgres   # or set DATABASE_URL in .env",
        `  ${run} db:push               # sync schema → database`,
      ].join("\n"),
      drizzle: [
        "",
        "  🐘  PostgreSQL + Drizzle:",
        "  docker compose up -d postgres   # or set DATABASE_URL in .env",
        `  ${run} db:push               # sync schema → database`,
      ].join("\n"),
      mongoose: [
        "",
        "  🍃  MongoDB + Mongoose:",
        "  docker compose up -d mongo      # or set MONGODB_URI in .env",
      ].join("\n"),
    };

    outro(
      [
        `  Project ready! Here's what to do next:\n`,
        `  cd ${projectName}`,
        autoInstall ? "" : `  ${packageManager} install`,
        `  cp .env.example .env   # Add your secrets`,
        dbNextSteps[db],
        `  ${run} dev          # Start the dev server → http://localhost:8005/docs`,
        `\n  ${run} gen:feature${packageManager === "npm" ? " --" : ""} order   # Add a feature module`,
        `  docker compose up --build    # Run the API in Docker`,
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
