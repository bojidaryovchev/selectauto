import type { Metadata } from "next";
import { CarsSection } from "@/components/cars";
import {
  FinalCtaSection,
  PopularBrandsSection,
  ProcessCtaSection,
  WhyUsSection,
} from "@/components/home";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { ParticleHero } from "@/components/three";
import { SITE_URL } from "@/constants";
import { getAuctionCars, getBuyNowCars } from "@/queries/cars";

/**
 * Home metadata. The page previously exported none (inheriting only the root
 * layout default); this gives it a distinct, keyword-bearing title/description +
 * a self-canonical and OG. (OG type/image/siteName are inherited from the root
 * layout's openGraph defaults.)
 */
export const metadata: Metadata = {
  title: "Внос на автомобили от Корея, САЩ и Канада | SelectAuto",
  description:
    "SelectAuto внася автомобили от Корея, САЩ и Канада чрез аукциони (Copart, IAAI, Encar) — подбор, търг, логистика, митница и предаване на ключ. Разгледай налични оферти и поискай калкулация.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Внос на автомобили от Корея, САЩ и Канада | SelectAuto",
    description:
      "Внос на автомобили от Корея, САЩ и Канада чрез аукциони — пълно съдействие от подбора до предаването на ключ.",
    url: SITE_URL,
  },
};

export default async function HomePage() {
  // The homepage is a static shell (Cache Components / PPR): the buy-now + auction
  // queries are `"use cache"` (cacheLife "hours"), so their output is prerendered
  // into the shell and shared across visitors; the WebGL hero's randomness is
  // client-only (inside useEffect), so nothing here is request-dependent.
  const [buyNowCars, auctionCars] = await Promise.all([
    getBuyNowCars(),
    getAuctionCars(),
  ]);

  return (
    <>
      <SiteHeader />

      <main className="flex-1 text-ink">
        {/* Real page <h1> for crawlers/AI/no-JS — the visible hero title lives in
            the WebGL canvas (not in the DOM), so the page would otherwise have no
            h1. Visually hidden, but it IS the page's true heading (not cloaking). */}
        <h1 className="sr-only">
          Внос на автомобили от Корея, САЩ и Канада — SelectAuto
        </h1>
        {/* Dark spacer so the fixed header sits above the hero, not on it. */}
        <div className="h-(--header-h) bg-shell" />
        <ParticleHero />

        <WhyUsSection />

        <ProcessCtaSection />

        {/* Buy-now listings */}
        <CarsSection
          eyebrow="Buy Now автомобили"
          title="Налични предложения, които можеш да вземеш сега"
          subtitle="Това са автомобили с директна възможност за покупка — подходящи за клиенти, които искат бързо и ясно решение."
          cars={buyNowCars}
          ctaHref="/vsichki-avtomobili/?channel=buy-now"
          ctaLabel="Виж всички Buy Now"
        />

        {/* Auction listings — auction cards without a photo are filtered out in
            the query rather than shown with a placeholder, like the real site. */}
        <CarsSection
          tinted
          eyebrow="Аукционни автомобили"
          title="Възможности от аукционите, подбрани със стратегия"
          subtitle="Аукционните автомобили дават силни възможности, когато зад избора има правилен подход и реална експертиза."
          cars={auctionCars}
          ctaHref="/vsichki-avtomobili/?channel=auction"
          ctaLabel="Виж всички аукционни автомобили"
        />

        <PopularBrandsSection />

        <FinalCtaSection />
      </main>

      <SiteFooter />
    </>
  );
}
