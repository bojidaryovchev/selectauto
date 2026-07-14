import type { MetadataRoute } from "next";
import { MIN_HUB_LISTINGS_TO_INDEX, SITE_URL } from "@/constants";
import { brandHubPath, modelHubPath } from "@/lib/car-slug";
import { getSitemapBrands, getSitemapHubs } from "@/queries/sitemap";

/**
 * Sitemap for the make/model SEO hubs — served at `/avtomobili/marka/sitemap.xml`
 * and referenced from `robots.ts`. Lists ONLY the indexable hubs (≥
 * `MIN_HUB_LISTINGS_TO_INDEX` live listings — the SAME threshold the hub page uses
 * for its `robots` directive), so a `noindex` hub is never advertised here.
 *
 * URLs are the canonical SLASHLESS form built from the resolved make/model names
 * via `slugify` — identical to the `alternates.canonical` the hub page emits, so
 * the sitemap URL and the page's self-canonical always agree. At ~1.3k qualifying
 * hubs this fits one sitemap (well under Google's 50k cap), so no chunking /
 * `generateSitemaps` (unlike the ~945k listing sitemap). Priority scales lightly
 * with inventory depth; `lastModified` uses the build time (hub content tracks live
 * inventory, which the daily-cached query refreshes).
 *
 * Static-emittable: reads only the cached hub query (no request-time API), so it
 * builds like `app/sitemap.ts`. Fails closed via the query's empty fallback — a DB
 * hiccup drops the hub sitemap rather than breaking the build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brands, models] = await Promise.all([
    getSitemapBrands(MIN_HUB_LISTINGS_TO_INDEX),
    getSitemapHubs(MIN_HUB_LISTINGS_TO_INDEX),
  ]);
  const now = new Date();

  // Brand hubs first (the parent tier), then model hubs. Both build the URL from
  // the SAME shared path helpers the pages use for their self-canonical, so a
  // sitemap URL and its page's canonical always agree. A name that slugs to "" has
  // no valid URL and is dropped (the page wouldn't resolve it either).
  const brandEntries = brands
    .map((b) => {
      const path = brandHubPath(b.brandName);
      if (!path) return null;
      return {
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        // Brand hubs sit above model hubs; give them a hair more weight (0.8/0.6).
        priority: b.listingCount >= 1000 ? 0.8 : 0.6,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const modelEntries = models
    .map((h) => {
      const path = modelHubPath(h.brandName, h.modelName);
      if (!path) return null;
      return {
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        // Deeper inventory → slightly higher priority, capped at 0.7 (below the
        // catalog's 0.9 and home's 1.0). ≥1000 listings → 0.7, else 0.5.
        priority: h.listingCount >= 1000 ? 0.7 : 0.5,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return [...brandEntries, ...modelEntries];
}
