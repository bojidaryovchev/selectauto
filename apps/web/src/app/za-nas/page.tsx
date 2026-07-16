import type { Metadata } from "next";
import {
  AboutClosing,
  AboutHero,
  AboutIntro,
  AboutProcess,
  AboutStats,
  AboutValues,
} from "@/components/about";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "За нас — SelectAuto",
  description:
    "В SelectAuto изграждаме сигурен, ясен и професионално управляван процес — от правилния избор до логистиката, регистрацията и финалното предаване.",
  alternates: { canonical: `${SITE_URL}/za-nas` },
  openGraph: {
    title: "За нас — SelectAuto",
    description:
      "Сигурен, ясен и професионално управляван процес по внос — от избора до финалното предаване.",
    url: `${SITE_URL}/za-nas`,
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-[#f4f5f7] text-[#18191c]">
        <AboutHero />
        <AboutIntro />
        <AboutStats />
        <AboutProcess />
        <AboutValues />
        <AboutClosing />
      </main>

      <SiteFooter />
    </>
  );
}
