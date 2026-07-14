import { neon } from "@neondatabase/serverless";
import { slugify } from "@/lib/car-slug";

/**
 * Legacy-WordPress → rebuild URL map, served by `proxy.ts` from day one of the
 * cutover (docs/13-seo-action-plan.md Phase 0). The old WP site is being removed
 * entirely; every legacy URL pattern must resolve to an unambiguous, crawl-cheap
 * signal: a 301 where a real equivalent exists, else **410 Gone**.
 *
 * Pattern decisions (see the plan doc's Phase 0 table):
 *  - Static WP pages 301 one-to-one (Cyrillic slugs → the rebuild's Latin routes).
 *  - The duplicate "all cars" pages and the `/car/` CPT archive 301 → the catalog.
 *  - `/car/{slug}` (~391k thin listing URLs): parse the make/model out of the slug
 *    and 301 into the matching **model hub** (`/avtomobili/marka/{make}/{model}`),
 *    falling back to the **brand hub**, else 410 — this recycles the old
 *    inventory's residual crawl equity into the durable ranking surfaces instead
 *    of soft-404ing everything at the catalog.
 *  - `/auction-car/{id}` and the WP test/junk pages: 410.
 *  - Anything else falls through (null) to normal routing — the proxy must NEVER
 *    terminate paths that belong to the live app.
 *
 * Runs in the Next 16 proxy (Node runtime). Like `sold-lot-gone.ts` it keeps its
 * own `neon()` HTTP client rather than importing the app's Drizzle pool
 * (proxy.md's "don't rely on shared modules" guidance). The make/model reference
 * tables (~117 / ~1286 rows) are cached in-module for an hour — legacy hits are
 * low-volume background crawl traffic, so a stale-by-an-hour name list is fine.
 *
 * Failure stance: `/car/` and `/auction-car/` URLs are dead regardless of what we
 * can resolve — on any DB error they 410 (never 500, never fall through to a soft
 * 404 shell). Static mappings never touch the DB.
 */

export type LegacyDecision = { kind: "redirect"; to: string } | { kind: "gone" };

/** Exact-path 301s (decoded, lowercased, no trailing slash). */
const STATIC_REDIRECTS: Record<string, string> = {
  // WP static pages (Cyrillic slugs) → rebuild routes.
  "/процес": "/proces",
  "/за-нас": "/za-nas",
  "/контакти": "/kontakti",
  // Duplicate "all cars" pages + the `car` CPT archive → one canonical catalog.
  "/cars": "/vsichki-avtomobili",
  "/всички-автомобили": "/vsichki-avtomobili",
  "/коли-за-продажба": "/vsichki-avtomobili",
  "/car": "/vsichki-avtomobili",
  // The old import-service page — incl. the broken slug variant that mixed a
  // Latin "c" into Cyrillic „внос" (both existed and both 200'd on WP).
  "/внос": "/",
  "/вноc": "/",
};

/** Exact-path 410s: WP test/junk pages (all were live + sitemap-submitted). */
const GONE_PATHS = new Set([
  "/sql-cars-test",
  "/sql-car-test",
  "/new-sql-listing",
  "/sample-page",
  "/all-cars-dashboard",
]);

let sqlClient: ReturnType<typeof neon> | null = null;
function getSql(): ReturnType<typeof neon> | null {
  if (sqlClient) return sqlClient;
  const url = process.env.NEON_DATABASE_URL;
  if (!url) return null;
  sqlClient = neon(url);
  return sqlClient;
}

type NamedRow = { name: string; slug: string; externalId: number; carsQty: number };

const REFERENCE_TTL_MS = 60 * 60 * 1000;

let makesCache: { rows: NamedRow[]; at: number } | null = null;
const modelsCache = new Map<number, { rows: NamedRow[]; at: number }>();

/** All manufacturers with a slug-able name, cached for an hour. */
async function getMakes(): Promise<NamedRow[]> {
  if (makesCache && Date.now() - makesCache.at < REFERENCE_TTL_MS) return makesCache.rows;
  const sql = getSql();
  if (!sql) throw new Error("NEON_DATABASE_URL not configured");
  const rows = (await sql`
    SELECT external_id, name, cars_qty FROM manufacturers WHERE name IS NOT NULL
  `) as { external_id: number; name: string; cars_qty: number | null }[];
  const named = rows
    .map((r) => ({ name: r.name, slug: slugify(r.name), externalId: Number(r.external_id), carsQty: r.cars_qty ?? 0 }))
    .filter((r) => r.slug.length > 0);
  makesCache = { rows: named, at: Date.now() };
  return named;
}

/** All models of one make with a slug-able name, cached per make for an hour. */
async function getModels(makeExternalId: number): Promise<NamedRow[]> {
  const hit = modelsCache.get(makeExternalId);
  if (hit && Date.now() - hit.at < REFERENCE_TTL_MS) return hit.rows;
  const sql = getSql();
  if (!sql) throw new Error("NEON_DATABASE_URL not configured");
  const rows = (await sql`
    SELECT external_id, name, cars_qty FROM vehicle_models
    WHERE manufacturer_external_id = ${makeExternalId} AND name IS NOT NULL
  `) as { external_id: number; name: string; cars_qty: number | null }[];
  const named = rows
    .map((r) => ({ name: r.name, slug: slugify(r.name), externalId: Number(r.external_id), carsQty: r.cars_qty ?? 0 }))
    .filter((r) => r.slug.length > 0);
  modelsCache.set(makeExternalId, { rows: named, at: Date.now() });
  return named;
}

/** True iff `needle` appears in hyphen-separated `hay` at token boundaries. */
function containsSlugToken(hay: string, needle: string): boolean {
  return (
    hay === needle ||
    hay.startsWith(`${needle}-`) ||
    hay.endsWith(`-${needle}`) ||
    hay.includes(`-${needle}-`)
  );
}

/**
 * Pick the best boundary-contained match: the LONGEST slug wins (so
 * "mercedes-benz" beats "mercedes", "x5-m" beats "x5"), ties broken by
 * inventory depth (`cars_qty`) for determinism, mirroring the hub resolver's
 * collision handling.
 */
function bestContainedMatch(hay: string, candidates: NamedRow[]): NamedRow | null {
  let best: NamedRow | null = null;
  for (const c of candidates) {
    if (!containsSlugToken(hay, c.slug)) continue;
    if (
      best === null ||
      c.slug.length > best.slug.length ||
      (c.slug.length === best.slug.length && c.carsQty > best.carsQty)
    ) {
      best = c;
    }
  }
  return best;
}

/**
 * `/car/{slug}` → hub redirect or 410. The WP slug is year + make + model + trim
 * (+ occasional Korean/Cyrillic tokens + `-N` dedupe suffixes); `slugify` folds it
 * to plain kebab, then the make/model are located by boundary containment against
 * the reference names. Model matching is scoped to the matched make's models to
 * avoid cross-make false positives.
 */
async function resolveLegacyCarSlug(rawSlug: string): Promise<LegacyDecision> {
  const slug = slugify(rawSlug);
  if (!slug) return { kind: "gone" };

  const make = bestContainedMatch(slug, await getMakes());
  if (!make) return { kind: "gone" };

  const model = bestContainedMatch(slug, await getModels(make.externalId));
  if (model) return { kind: "redirect", to: `/avtomobili/marka/${make.slug}/${model.slug}` };
  return { kind: "redirect", to: `/avtomobili/marka/${make.slug}` };
}

/**
 * Decide what to do with a request path: a legacy 301/410, or null to fall
 * through to normal routing. Static decisions are pure string work; only
 * `/car/{slug}` touches the DB (and 410s on any failure — those URLs are dead
 * either way).
 */
export async function resolveLegacyPath(pathname: string): Promise<LegacyDecision | null> {
  // WP served percent-encoded Cyrillic/Korean paths; malformed sequences fall
  // back to the raw path (which then simply won't match anything).
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* keep raw */
  }
  const path = (decoded.length > 1 ? decoded.replace(/\/+$/, "") : decoded).toLowerCase();

  const target = STATIC_REDIRECTS[path];
  if (target) return { kind: "redirect", to: target };
  if (GONE_PATHS.has(path)) return { kind: "gone" };

  if (path.startsWith("/auction-car/")) return { kind: "gone" };

  if (path.startsWith("/car/")) {
    try {
      return await resolveLegacyCarSlug(path.slice("/car/".length));
    } catch (error) {
      console.error("[legacy-redirects] /car/ resolution failed, serving 410", error);
      return { kind: "gone" };
    }
  }

  return null;
}
