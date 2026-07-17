import type { Metadata } from "next";
import {
  CarfaxBenefits,
  CarfaxFormSection,
  CarfaxHero,
} from "@/components/carfax";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  // Targets the real Carfax brand demand in BG („carfax българия", „carfax
  // цена" — docs/12-web-seo-strategy.md §3.4): name the country and the price
  // question in the title/description instead of the generic „заявка".
  title: "Carfax проверка в България — поръчай доклад | SelectAuto",
  description:
    "Поръчай Carfax проверка от България на изгодна цена — пълна история на автомобила по VIN: пробег, инциденти, собственици и важни записи преди покупка.",
  alternates: { canonical: `${SITE_URL}/carfax` },
  ...buildSocialMeta({
    title: "Carfax проверка в България — поръчай доклад | SelectAuto",
    description:
      "Carfax доклад от България — пробег, инциденти, собственици и важни записи, преди да вземеш решение.",
    path: "/carfax",
  }),
};

export default function CarfaxPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Carfax проверка", url: "/carfax" },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteHeader />

      <main className="flex-1 bg-[#f4f5f7] text-[#191b20]">
        {/* Dark spacer so the fixed header sits above the hero image, not on it. */}
        <div className="h-(--header-h) bg-shell" />
        <CarfaxHero />
        <CarfaxBenefits />
        <CarfaxFormSection />
      </main>

      <SiteFooter />
    </>
  );
}
