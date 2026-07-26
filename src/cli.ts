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
import yauzl from "yauzl";

// ─── Constants ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf-8")) as {
  version: string;
};

const REPO_ZIP_URL =
  "https://github.com/Be1newinner/create-express-ts/archive/refs/heads/main.zip";
const REPO_SUBDIR = "create-express-ts-main/packages/express-type/";

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
          // Skip if relativePath is empty (the subdir itself)
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

/** Updates the project name inside the scaffolded package.json */
async function updatePackageJson(destination: string, projectName: string): Promise<void> {
  const pkgPath = path.join(destination, "package.json");
  if (!existsSync(pkgPath)) return;
  const raw = await readFile(pkgPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed["name"] = projectName;
  parsed["version"] = "0.1.0";
  await writeFile(pkgPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

// Handle --version / --help before the interactive UI
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

  Examples:
    npx create-express-type                  # Interactive mode
    npx create-express-type my-api           # Scaffold with given name
    npx create-express-type my-api --help    # Show help
  `);
  process.exit(0);
}

async function main(): Promise<void> {
  console.log("");
  intro("  🚀  create-express-type — TypeScript + Express Scaffolding  ");

  // ── Step 1: Project Name ───────────────────────────────────────────────────
  let projectName = args.find((a) => !a.startsWith("--") && !a.startsWith("-"));

  if (!projectName) {
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
    // Validate the positional arg
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

  if (available.length > 1) {
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

  // ── Step 3: Auto-install prompt ────────────────────────────────────────────
  const autoInstall = await confirm({
    message: `Install dependencies now using ${packageManager}?`,
    initialValue: true,
  });

  if (isCancel(autoInstall)) {
    cancel("Cancelled. No files were created.");
    process.exit(0);
  }

  // ── Step 4: Download & Extract ─────────────────────────────────────────────
  const s = spinner();
  s.start("Downloading template from GitHub...");

  try {
    await mkdir(destination, { recursive: true });

    // Use native fetch (Node 18+)
    const response = await fetch(REPO_ZIP_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to download template (HTTP ${response.status}: ${response.statusText})`
      );
    }

    s.message("Extracting files...");
    const arrayBuffer = await response.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    await extractZip(zipBuffer, destination, REPO_SUBDIR);

    s.message("Configuring project...");
    await updatePackageJson(destination, projectName as string);

    s.stop(`✅ Project "${projectName}" created at ./${projectName}`);

    // ── Step 5: Install dependencies ───────────────────────────────────────
    if (autoInstall) {
      const installSpinner = spinner();
      installSpinner.start(`Installing dependencies with ${packageManager}...`);
      try {
        execSync(`${packageManager} install`, {
          cwd: destination,
          stdio: "pipe",
        });
        installSpinner.stop("✅ Dependencies installed!");
      } catch {
        installSpinner.stop(
          "⚠️  Auto-install failed. Run the install command manually in the project directory."
        );
      }
    }

    // ── Step 6: Next Steps ─────────────────────────────────────────────────
    const installCmd = autoInstall ? "" : `\n  ${packageManager} install`;
    outro(
      [
        `  Project ready! Here's what to do next:\n`,
        `  cd ${projectName}`,
        installCmd,
        `  cp .env.example .env   # Add your secrets`,
        `  ${packageManager} run dev          # Start the dev server\n`,
        `  🌐  Docs: https://github.com/Be1newinner/create-express-ts`,
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
