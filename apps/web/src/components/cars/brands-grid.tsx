import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { BRANDS } from "@/data/home";

/**
 * Popular-brands grid — ports the `selectauto_popular_brands` plugin's
 * `sab-brands-*` markup and CSS: a header with a navy title + "Виж всички →"
 * link, then a flex grid (6 per row → 5 → 4 → 3) of cards with grayscale logos
 * that turn full-colour on hover.
 *
 * The flex item widths use the plugin's exact `calc()` formulas, expressed as
 * arbitrary Tailwind values with responsive variants.
 */
export function BrandsGrid() {
  return (
    <section className="py-14">
      <div className="mx-auto w-[min(100%-28px,1280px)]">
        {/* sab-brands-head */}
        <div className="mb-7 flex items-center justify-between gap-5 max-[991px]:mb-[22px]">
          <h2 className="m-0 text-[52px] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#0b1736] max-[1600px]:text-[46px] max-[991px]:text-[34px]">
            Популярни марки
          </h2>
          <Link
            href="/vsichki-avtomobili/"
            className="inline-flex items-center gap-2.5 whitespace-nowrap text-lg font-bold text-[#c86116] transition-[opacity,transform] duration-200 hover:translate-x-0.5 hover:opacity-90 max-[991px]:text-base"
          >
            <span>Виж всички</span>
            <ArrowRightIcon className="h-[22px] w-[22px] flex-[0_0_22px]" />
          </Link>
        </div>

        {/* sab-brands-list — flex wrap, widths per breakpoint */}
        <div className="flex w-full flex-wrap gap-[18px] max-[991px]:gap-3.5">
          {BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href="/vsichki-avtomobili/"
              aria-label={brand.name}
              className="group block min-w-0 basis-[calc((100%-90px)/6)] max-[1600px]:basis-[calc((100%-72px)/5)] max-[1280px]:basis-[calc((100%-54px)/4)] max-[991px]:basis-[calc((100%-28px)/3)]"
            >
              <div className="relative flex h-[196px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#d8e0ea] bg-white px-3.5 pb-[18px] pt-[22px] text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-[3px] group-hover:border-[#c86116] group-hover:shadow-[0_14px_28px_rgba(20,34,66,0.08)] max-[1280px]:h-[186px]">
                <div className="mb-4 flex h-[68px] w-full flex-[0_0_auto] items-center justify-center">
                  <Image
                    src={`/brand-logos/${brand.slug}.png`}
                    alt={brand.name}
                    width={84}
                    height={48}
                    className="block max-h-[48px] max-w-[84px] object-contain opacity-[0.72] grayscale transition-[filter,opacity,transform] duration-200 group-hover:scale-[1.04] group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
                <div className="break-words text-lg font-extrabold leading-[1.28] text-[#2c3b57] transition-colors duration-200 group-hover:text-[#c86116]">
                  {brand.name}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
