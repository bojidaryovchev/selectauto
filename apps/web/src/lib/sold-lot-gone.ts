import { neon } from "@neondatabase/serverless";
import { SOLD_LOT_410_AFTER } from "@/constants";

/**
 * Decide whether a `/avtomobil/{id}` request should return **410 Gone** — true iff
 * the car is archived AND was archived at least `SOLD_LOT_410_AFTER` ago. Used by
 * `proxy.ts` (which can emit a 410 status; the PPR page cannot — see
 * docs/11-web-seo-and-indexing.md §3).
 *
 * Runs in the Next 16 proxy, which is the **Node.js runtime** (v16 made proxy
 * node-only and non-configurable — verified in the version-16 upgrade guide), so a
 * DB call here is fine despite the historical "edge-safe" note on the auth config.
 * Kept self-contained (its own `neon()` HTTP client + a single car_id PK point-
 * lookup on the `cla_archived_at` index, migration 0023) rather than importing the
 * app's Drizzle pool, matching proxy.md's "don't rely on shared modules" guidance.
 *
 * Fails **closed to `false`** (never 410) on any error or missing config — a DB
 * hiccup must never take down a live car page.
 */

let sqlClient: ReturnType<typeof neon> | null = null;
function getSql(): ReturnType<typeof neon> | null {
  if (sqlClient) return sqlClient;
  const url = process.env.NEON_DATABASE_URL;
  if (!url) return null;
  sqlClient = neon(url);
  return sqlClient;
}

/** Parse a `/avtomobil/{id}` (optional trailing slash) pathname → positive int id,
 *  or null if it isn't that route. */
export function parseAvtomobilId(pathname: string): number | null {
  const m = pathname.match(/^\/avtomobil\/(\d+)\/?$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** True iff car `id` is archived and old enough to 410. Fails closed to false. */
export async function isLongDeadArchivedLot(id: number): Promise<boolean> {
  try {
    const sql = getSql();
    if (!sql) return false;
    const rows = (await sql`
      SELECT 1
      FROM car_listings_archived
      WHERE car_id = ${id}
        AND archived_at IS NOT NULL
        AND archived_at < now() - ${SOLD_LOT_410_AFTER}::interval
      LIMIT 1
    `) as unknown[];
    return rows.length > 0;
  } catch (error) {
    console.error("[sold-lot-gone] 410 check failed, not gone", error);
    return false;
  }
}
