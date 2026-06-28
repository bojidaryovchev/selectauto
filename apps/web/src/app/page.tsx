import { CarsSection } from "@/components/cars";
import {
  FinalCtaSection,
  PopularBrandsSection,
  ProcessCtaSection,
  WhyUsSection,
} from "@/components/home";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { ParticleHero } from "@/components/three";
import { getAuctionCars, getBuyNowCars } from "@/queries/cars";

export default async function HomePage() {
  const [buyNowCars, auctionCars] = await Promise.all([
    getBuyNowCars(),
    getAuctionCars(),
  ]);

  return (
    <>
      <SiteHeader />

      <main className="flex-1 text-ink">
        <ParticleHero />

        <WhyUsSection />

        <ProcessCtaSection />

        {/* Buy-now listings */}
        <CarsSection
          eyebrow="Buy Now автомобили"
          title="Налични предложения, които можеш да вземеш сега"
          subtitle="Това са автомобили с директна възможност за покупка — подходящи за клиенти, които искат бързо и ясно решение."
          cars={buyNowCars}
          ctaHref="/коли-за-продажба/"
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
          ctaHref="/внос/"
          ctaLabel="Виж всички аукционни автомобили"
        />

        <PopularBrandsSection />

        <FinalCtaSection />
      </main>

      <SiteFooter />
    </>
  );
}
