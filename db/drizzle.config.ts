/**
 * Drizzle Kit config — for generating migrations from schema.ts during
 * development. The canonical production migration is the hand-maintained SQL in
 * migrations/0001_initial.sql, run by migrate.mjs. Use `drizzle-kit generate`
 * only when evolving the schema, then reconcile the generated SQL.
 */
import type { Config } from "drizzle-kit";

export default {
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL ?? "",
  },
} satisfies Config;
