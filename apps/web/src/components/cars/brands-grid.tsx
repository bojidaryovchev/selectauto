import Image from "next/image";
import Link from "next/link";
import { Ripple } from "@/components/common";
import { ArrowRightIcon } from "@/components/icons";
import { brandHubPath } from "@/lib/car-slug";
import { getCarBrands } from "@/queries/cars";
import { BRANDS } from "@/data/home";

const CATALOG_PATH = "/vsichki-avtomobili";

/**
 * Popular-brands grid — ports the `selectauto_popular_brands` plugin's
 * `sab-brands-*` markup and CSS: a header with a navy title + "Виж всички →"
 * link, then a flex grid (6 per row → 5 → 4 → 2 on mobile) of cards with grayscale logos
 * that turn full-colour on hover.
 *
 * The flex item widths use the plugin's exact `calc()` formulas, expressed as
 * arbitrary Tailwind values with responsive variants.
 *
 * Each card links to that make's **brand hub** (`/avtomobili/marka/{make}`), NOT
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
    <section className="py-14">
      <div className="mx-auto w-[min(100%-28px,1280px)]">
        {/* sab-brands-head */}
        <div className="mb-7 flex items-center justify-between gap-5 max-[991px]:mb-5.5">
          <h2 className="m-0 text-[52px] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#0b1736] max-[1600px]:text-[46px] max-[991px]:text-[34px]">
            Популярни марки
          </h2>
          <Link
            href="/vsichki-avtomobili"
            className="inline-flex items-center gap-2.5 whitespace-nowrap text-lg font-bold text-[#c86116] transition-[opacity,transform] duration-200 hover:translate-x-0.5 hover:opacity-90 max-[991px]:text-base"
          >
            <span>Виж всички</span>
            <ArrowRightIcon className="size-5.5 flex-[0_0_22px]" />
          </Link>
        </div>

        {/* sab-brands-list — flex wrap, widths per breakpoint */}
        <div className="flex w-full flex-wrap gap-4.5 max-[991px]:gap-3.5">
          {BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={hrefFor(brand.name)}
              aria-label={brand.name}
              className="group block min-w-0 basis-[calc((100%-90px)/6)] max-[1600px]:basis-[calc((100%-72px)/5)] max-[1280px]:basis-[calc((100%-54px)/4)] max-[991px]:basis-[calc((100%-14px)/2)]"
            >
              <div className="relative flex h-49 flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#d8e0ea] bg-white px-3.5 pb-4.5 pt-5.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.75 group-hover:border-[#c86116] group-hover:shadow-[0_14px_28px_rgba(20,34,66,0.08)] max-[1280px]:h-46.5">
                <div className="mb-4 flex h-17 w-full flex-[0_0_auto] items-center justify-center">
                  <Image
                    src={`/brand-logos/${brand.slug}.png`}
                    alt={brand.name}
                    width={84}
                    height={48}
                    className="block max-h-12 max-w-21 object-contain opacity-[0.72] grayscale transition-[filter,opacity,transform] duration-200 group-hover:scale-[1.04] group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
                <div className="w-full wrap-break-word text-lg font-extrabold leading-[1.28] text-[#2c3b57] transition-colors duration-200 group-hover:text-[#c86116] max-[1280px]:text-base">
                  {brand.name}
                </div>
                <Ripple theme="dark" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
