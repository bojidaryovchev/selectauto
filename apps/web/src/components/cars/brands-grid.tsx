import Link from "next/link";
import { LinkButton } from "@/components/common";
import { ArrowRightIcon } from "@/components/icons";
import { brandHubPath } from "@/lib/car-slug";
import { makeLogo } from "@/lib/make-logo";
import { getCarBrands } from "@/queries/cars";
import { BRANDS } from "@/data/home";

const CATALOG_PATH = "/vsichki-avtomobili";

/**
 * Popular-brands grid (board `hm-home`): a „Популярни марки" heading with „Вижте всички" to the catalog, then 18 make
 * tiles: the logo on a light plate in its own colours (decision 8: makes always show their logo) and the name. The
 * tiles fill columns of at least 176 px (9 across at 1920 px); a phone shows 3 per row.
 *
 * The logos are the site's own files (`makeLogo`), the same as on every other plate: small SVGs and rasters of at most
 * 256 px, so they load as they are (next/image refuses SVG).
 *
 * Each tile links to that make's **brand hub** (`/avtomobili/marka/{make}`), NOT
 * to a `?brand=<externalId>` catalog filter. The hubs are the durable ranking
 * asset — 36 of the domain's 56 ranking keywords land on `/avtomobili/marka/*`
 * (2026-08-18 measurement) — whereas the faceted catalog URLs this grid used to
 * emit were being indexed *despite* their canonical to the bare catalog, showing
 * a generic „Всички автомобили" title and cannibalising the very hubs they
 * outrank nothing against. This grid is the homepage's strongest internal-link
 * source, so it must push equity into the hubs. See
 * docs/14-market-research-2026-08.md §6.3.
 *
 * `getCarBrands()` is still consulted — a cheap brand-list query (NOT the full
 * `getCarFacets`, which is ~5s and statement-timeout'd the build) — but only to
 * confirm the make EXISTS upstream and to take its canonical DB `name`. The slug
 * is then derived by the shared `brandHubPath()` helper, the same one the hub
 * page's self-canonical and the hub sitemap use, so every producer of a hub URL
 * agrees. A brand absent from the DB (or one that slugs to "") falls back to the
 * unfiltered catalog rather than linking at a hub that would `notFound()`.
 */
export async function BrandsGrid() {
  const brands = await getCarBrands();
  // Key by lowercased name, but keep the DB's own label: the hub resolver slugs
  // the upstream `manufacturers.name`, so slugging that same string is what
  // guarantees the link resolves.
  const dbLabelByName = new Map(brands.map((b) => [b.label.toLowerCase(), b.label]));

  const hrefFor = (name: string): string => {
    const label = dbLabelByName.get(name.toLowerCase());
    if (label === undefined) return CATALOG_PATH;
    return brandHubPath(label) ?? CATALOG_PATH;
  };

  return (
    <div>
      <div className="sa-between mb-5">
        <h3 className="type-h3">Популярни марки</h3>
        <LinkButton href={CATALOG_PATH} variant="txt" size="md">
          Вижте всички
          <ArrowRightIcon />
        </LinkButton>
      </div>

      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] sm:gap-4">
        {BRANDS.map((brand) => (
          <li key={brand.id} className="flex min-w-0">
            <Link
              href={hrefFor(brand.name)}
              aria-label={brand.name}
              // The click ripple, as `main`'s tiles had (components/common/ripple-layer.tsx).
              data-ripple=""
              className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-lg border border-hair bg-s2 px-1.5 pt-3.5 pb-3 text-center text-tx transition-colors duration-150 ease-out hover:border-or hover:bg-s3 motion-reduce:transition-none sm:min-h-43 sm:gap-3.5 sm:px-3 sm:pt-5.5 sm:pb-4.5"
            >
              <span className="sa-plate sa-plate--xl [--ps:48px] sm:[--ps:88px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- a small local SVG/WebP, already at plate size */}
                <img
                  src={makeLogo(brand.id) ?? undefined}
                  alt={brand.name}
                  width={70}
                  height={70}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className="text-[13px] leading-tight font-extrabold wrap-anywhere sm:text-base">{brand.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
