#!/usr/bin/env node
/**
 * Decides whether a new npm release is needed, and which version it gets.
 *
 * Versioning rules:
 *   - patch (x.y.Z) — automatic, on every push to main that changes something that
 *     ships in the npm package: the CLI (src/), the templates (packages/) or package.json.
 *     Docs-, CI- and test-only changes never release.
 *   - minor (x.Y.0) — only with the maintainer's approval: run the Release workflow
 *     by hand with bump = minor.
 *   - major (X.0.0) — never done by automation.
 *
 * Releases are staged on npm (`npm stage publish`) and tagged vX.Y.Z when staged.
 * A staged version can't be staged again, so the previous release is the highest of
 * the version published on npm and the vX.Y.Z git tags (staged, not yet approved).
 *
 * Env:    BUMP   = patch (default) | minor
 *         MANUAL = true when started by hand (releases even if nothing shipped changed)
 * Writes: $GITHUB_OUTPUT — release (true|false), version, previous, bump
 *         release-notes.md — the shipped commits included in the release
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

/** Paths whose changes reach users through the npm package */
const SHIPPED_PATHS = [
  "src",
  "packages",
  "package.json",
  // Only used by the repo's CI — never copied into scaffolded projects
  ":(exclude)packages/express-type/package-lock.json",
];

const bump = process.env.BUMP || "patch";
const manual = process.env.MANUAL === "true";

if (bump !== "patch" && bump !== "minor") {
  console.error(`BUMP must be "patch" or "minor" (got "${bump}"). Major versions are never automated.`);
  process.exit(1);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf-8" }).trim();

/** Runs an npm command, returning "" instead of throwing (e.g. package not published yet) */
const npm = (...args) => {
  try {
    return execFileSync("npm", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const isCommit = (ref) => {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const setOutputs = (outputs) => {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  console.log(lines.join("\n"));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
};

// ─── Previous release ─────────────────────────────────────────────────────────

const parseVersion = (v) => v.replace(/^v/, "").split("-")[0].split(".").map(Number);
const compareVersions = (a, b) => {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

const { name } = JSON.parse(readFileSync("package.json", "utf-8"));
const npmVersion = npm("view", name, "version");

if (!npmVersion) {
  console.error(`Couldn't read the published version of ${name} from npm.`);
  process.exit(1);
}

// Tags of releases that were staged — possibly still waiting for approval on npm
const taggedVersions = git("tag", "--list", "v*")
  .split("\n")
  .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag))
  .map((tag) => tag.slice(1));

const published = [npmVersion, ...taggedVersions].sort(compareVersions).at(-1);

// The commit the previous release was built from: its tag, or the gitHead npm recorded
const base = isCommit(`v${published}`)
  ? `v${published}`
  : npm("view", `${name}@${published}`, "gitHead");

if (!base || !isCommit(base)) {
  console.error(
    `Can't find the commit v${published} was released from. ` +
      `Tag it (git tag v${published} <sha> && git push origin v${published}) and re-run.`
  );
  process.exit(1);
}

// ─── Commits that changed shipped files ───────────────────────────────────────

const commits = git("log", "--format=%h%x00%s%x1e", `${base}..HEAD`, "--", ...SHIPPED_PATHS)
  .split("\x1e")
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [sha, subject] = record.split("\x00");
    return { sha, subject };
  });

if (commits.length === 0 && !manual) {
  console.log(`Nothing that ships has changed since ${base} (v${published}) — no release.`);
  setOutputs({ release: false, version: published, previous: published, bump: "none" });
  process.exit(0);
}

// ─── Next version ─────────────────────────────────────────────────────────────

const [major, minor, patch] = parseVersion(published);
const version = bump === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

writeFileSync(
  "release-notes.md",
  commits.length > 0
    ? commits.map(({ sha, subject }) => `- ${subject} (${sha})`).join("\n") + "\n"
    : "No changes to shipped files since the previous release.\n"
);

console.log(`${commits.length} shipped commit(s) since ${base} → ${bump}: ${published} → ${version}`);

const features = commits.filter(({ subject }) => /^feat(\([^)]*\))?!?:/.test(subject));
if (bump === "patch" && features.length > 0) {
  console.log(
    `::notice title=Includes new features::${features.length} feat commit(s) released as a patch. ` +
      `To publish a minor version instead, run the Release workflow manually with bump = minor.`
  );
}

setOutputs({ release: true, version, previous: published, bump });
