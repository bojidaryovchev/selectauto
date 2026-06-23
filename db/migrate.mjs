/**
 * Minimal SQL migration runner.
 *
 * Applies every db/migrations/*.sql file (in lexical order) that hasn't been
 * applied yet, tracking applied files in a `_migrations` table. Idempotent:
 * re-running applies only new files. The migration SQL itself uses
 * IF NOT EXISTS, so even a partial re-run is safe.
 *
 * Usage (NEON_DATABASE_URL must be set; the npm scripts auto-load it from the
 * repo-root .env via `node --env-file`):
 *   npm run migrate            # apply all pending migrations
 *   npm run migrate:status     # list applied + pending, apply nothing
 *
 * Or directly:
 *   NEON_DATABASE_URL="postgres://...pooler.../db?sslmode=require" node migrate.mjs
 *   node migrate.mjs --status
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

// `--status` (or `migrate:status`) lists state without applying anything.
const statusOnly = process.argv.includes("--status");

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error(
    "NEON_DATABASE_URL is not set.\n" +
      "Set it in the repo-root .env (the npm scripts auto-load it), or export it:\n" +
      '  $env:NEON_DATABASE_URL = "postgres://...-pooler.../db?sslmode=require"',
  );
  process.exit(1);
}

// TLS is configured explicitly via the pg.Client `ssl` option below, so the
// `sslmode` URL param is redundant and only triggers node-postgres's noisy
// deprecation warning. Strip it (mirrors functions/shared/db.ts).
const cleanConnectionString = (() => {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return connectionString.replace(/([?&])sslmode=[^&]*(&|$)/i, (_m, pre, post) => (post === "&" ? pre : ""));
  }
})();

const client = new pg.Client({
  connectionString: cleanConnectionString,
  ssl: { rejectUnauthorized: true },
});

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

  // Status mode: print applied/pending and exit without applying.
  if (statusOnly) {
    console.log("Migration status:");
    for (const file of files) {
      console.log(`  ${applied.has(file) ? "[applied]" : "[pending]"} ${file}`);
    }
    const pending = files.filter((f) => !applied.has(f)).length;
    console.log(pending === 0 ? "Up to date." : `${pending} pending migration(s).`);
    return;
  }

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
