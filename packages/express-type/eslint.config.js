import globals from "globals";
import jsPlugin from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').ESLint.FlatConfig[]} */
export default [
  // ── Ignored Paths ─────────────────────────────────────────────────────────
  {
    ignores: ["eslint.config.js", "prettier.config.js", "esbuild.config.js", "loader.mjs", "node_modules", "dist"],
  },

  // ── All JS/TS Files ───────────────────────────────────────────────────────
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      // Fix: use globals.node (not globals.browser) — this is a Node.js server
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // Disable console in production builds, allow in development
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
      // Disable the base rule (TypeScript-ESLint overrides it)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",       // Allow _req, _res, _next
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error", // Catch unawaited promises
      "@typescript-eslint/consistent-type-imports": [   // Enforce `import type` for types
        "error",
        { prefer: "type-imports" },
      ],
    },
  },

  // ── JavaScript-Only Files ─────────────────────────────────────────────────
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      ...jsPlugin.configs.recommended.rules,
    },
  },

  // ── TypeScript-Only Files ─────────────────────────────────────────────────
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
];
