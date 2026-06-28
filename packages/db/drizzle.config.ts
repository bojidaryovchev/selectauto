/**
 * Drizzle Kit config — for generating migrations from schema.ts during
 * development. The canonical production migration is the hand-maintained SQL in
 * migrations/0001_initial.sql, run by migrate.mjs. Use `drizzle-kit generate`
 * only when evolving the schema, then reconcile the generated SQL.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import type { Config } from "drizzle-kit";

// Load the repo-root .env so NEON_DATABASE_URL is available regardless of how
// drizzle-kit is invoked (it doesn't pass through the migrate scripts' --env-file).
const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
if (existsSync(rootEnv)) loadEnvFile(rootEnv);

export default {
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL ?? "",
  },
} satisfies Config;
