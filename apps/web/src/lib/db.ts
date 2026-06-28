import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@auctions-ingestion/db/schema";

/**
 * Drizzle client for the website's server-side database access (Neon Postgres),
 * sharing the `@auctions-ingestion/db` schema with the ingestion pipeline.
 *
 * A single pooled connection is reused across requests and survives Next.js dev
 * hot-reloads via a global cache, so we don't leak a new pool on every edit.
 * Connection handling mirrors packages/db/migrate.mjs: the `sslmode` URL param
 * is stripped (TLS is configured explicitly here) to avoid node-postgres's
 * deprecation warning.
 */

function cleanConnectionString(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return raw.replace(/([?&])sslmode=[^&]*(&|$)/i, (_m, pre, post) =>
      post === "&" ? pre : "",
    );
  }
}

const globalForDb = globalThis as unknown as {
  __carfaxPool?: Pool;
};

function getPool(): Pool {
  if (globalForDb.__carfaxPool) return globalForDb.__carfaxPool;

  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error("NEON_DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: cleanConnectionString(connectionString),
    ssl: { rejectUnauthorized: true },
  });

  globalForDb.__carfaxPool = pool;
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export { schema };
