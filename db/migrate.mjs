/**
 * Minimal SQL migration runner.
 *
 * Applies every db/migrations/*.sql file (in lexical order) that hasn't been
 * applied yet, tracking applied files in a `_migrations` table. Idempotent:
 * re-running applies only new files. The migration SQL itself uses
 * IF NOT EXISTS, so even a partial re-run is safe.
 *
 * Usage:
 *   NEON_DATABASE_URL="postgres://...pooler.../db?sslmode=require" node migrate.mjs
 *
 * Use the Neon DIRECT (non-pooled) connection string for DDL if you hit issues
 * with the pooled endpoint; pooled works for these simple statements too.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("NEON_DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: true } });

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set((await client.query("SELECT filename FROM _migrations")).rows.map((r) => r.filename));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`apply  ${file}`);
    await client.query(sql);
    await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
    count += 1;
  }

  console.log(count === 0 ? "Nothing to apply." : `Applied ${count} migration(s).`);
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("Migration failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
