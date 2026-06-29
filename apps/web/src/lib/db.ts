import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@auctions-ingestion/db/schema";

/**
 * Drizzle client for the website's server-side database access (Neon Postgres),
 * sharing the `@auctions-ingestion/db` schema with the ingestion pipeline.
 *
 * Uses the **Neon serverless driver** (`@neondatabase/serverless`), not
 * `node-postgres`. On Vercel each function instance is a short-lived process, so
 * a classic TCP `pg.Pool` can't amortise its connection across requests the way
 * it does in a long-lived local `next dev` process — every cold instance paid a
 * full TCP+TLS handshake to Neon (Frankfurt) before the first query could run,
 * which (together with the function defaulting to the US `iad1` region, now
 * pinned to `fra1` in vercel.json) was the cause of multi-second first-paint
 * latency in production while local dev stayed ~500ms. The Neon driver speaks
 * Postgres over WebSocket/HTTP and is built for this serverless cold-start case.
 *
 * The driver's `Pool` is API-compatible with `pg`'s, so the Drizzle adapter and
 * every call site are unchanged. A single pool is reused across requests and
 * survives Next.js dev hot-reloads via a global cache, so we don't leak a new
 * pool on every edit. TLS is handled by the driver from the connection string
 * (which keeps `sslmode=require`), so no explicit `ssl` config is needed here.
 */

const globalForDb = globalThis as unknown as {
  __carfaxPool?: Pool;
};

function getPool(): Pool {
  if (globalForDb.__carfaxPool) return globalForDb.__carfaxPool;

  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error("NEON_DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });

  globalForDb.__carfaxPool = pool;
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export { schema };
