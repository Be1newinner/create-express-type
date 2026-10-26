// Installs Husky git hooks on `npm install`, but skips production and CI
// installs (e.g. inside Docker), where Husky isn't installed.
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
  process.exit(0);
}
const husky = (await import("husky")).default;
console.log(husky());
