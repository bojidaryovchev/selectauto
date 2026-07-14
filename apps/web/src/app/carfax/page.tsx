import type { Metadata } from "next";
import {
  CarfaxBenefits,
  CarfaxFormSection,
  CarfaxHero,
} from "@/components/carfax";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Carfax заявка — SelectAuto",
  description:
    "Поръчай Carfax проверка за избрания автомобил. Получи по-ясна представа за историята на автомобила — пробег, инциденти, собственици и важни записи преди да вземеш решение.",
  alternates: { canonical: `${SITE_URL}/carfax` },
  openGraph: {
    title: "Carfax заявка — SelectAuto",
    description:
      "Поръчай Carfax проверка — пробег, инциденти, собственици и важни записи, преди да вземеш решение.",
    url: `${SITE_URL}/carfax`,
  },
};

export default function CarfaxPage() {
  return (
    <>
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
