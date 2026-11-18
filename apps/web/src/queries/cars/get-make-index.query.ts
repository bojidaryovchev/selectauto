import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { makeLogo } from "@/lib/make-logo";

/** Every car make by its external id (the `manufacturer_id` on a listing): its name and its logo URL, if any. */
export type MakeIndex = Record<number, { name: string; logo: string | null }>;

/**
 * The cached read, with AuctionsAPI's logo links as stored. Cached for days under the cars tag, like `getCarBrands`:
 * the reference sync renames or adds a make rarely. It THROWS on a failure on purpose: a thrown error is never stored
 * (the default handler drops an errored entry), whereas a returned empty index would be served as „no plates" until
 * the next revalidation.
 */
async function readMakeIndex(): Promise<MakeIndex> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const rows = await getDb()
    .select({
      id: schema.manufacturers.externalId,
      name: schema.manufacturers.name,
      logo: schema.manufacturers.imageUrl,
    })
    .from(schema.manufacturers);
  const index: MakeIndex = {};
  for (const r of rows) {
    if (r.id == null || !r.name) continue;
    index[r.id] = { name: r.name, logo: r.logo || null };
  }
  return index;
}

/**
 * The makes, for the logo plate on every car card (decision 8: car makes always show their logo; a make without one
 * shows two letters). About 600 rows of `manufacturers`, so one small read serves every card on every page.
 *
 * Each logo is the site's own file (`makeLogo`), resolved here, outside the cached read, so a changed file shows with
 * the next deploy rather than when the cache expires. A new object each time: the cached index is shared.
 *
 * On a failure the cards it was asked for show no plate, and the next call reads again. A caller that caches its own
 * result (the home rails, the catalog pages) keeps those cards plate-less until that cache refreshes.
 */
export async function getMakeIndex(): Promise<MakeIndex> {
  try {
    const stored = await readMakeIndex();
    const index: MakeIndex = {};
    for (const [id, make] of Object.entries(stored)) {
      index[Number(id)] = { name: make.name, logo: makeLogo(Number(id), make.logo) };
    }
    return index;
  } catch (error) {
    // Next's own control-flow errors (a prerender bail-out, say) pass through; only a failed read falls back.
    unstable_rethrow(error);
    console.error("[get-make-index] query failed, cards show no plates for now", error);
    return {};
  }
}
