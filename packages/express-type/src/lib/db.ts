/**
 * Database lifecycle hooks, used by src/index.ts (startup/shutdown) and the
 * /health endpoint in src/app.ts.
 *
 * This project was scaffolded without a database, so these are no-ops.
 * Wire up your database client here when you add one.
 */

/** Opens the database connection. Called before the server starts listening. */
export async function connectDB(): Promise<void> {}

/** Closes the database connection. Called during graceful shutdown. */
export async function disconnectDB(): Promise<void> {}

/** Connection status reported by /health, or undefined when there is no database. */
export async function getDbStatus(): Promise<string | undefined> {
  return undefined;
}
