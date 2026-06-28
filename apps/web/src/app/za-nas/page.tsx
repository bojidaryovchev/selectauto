import type { Metadata } from "next";
import {
  AboutCta,
  AboutFeatures,
  AboutHero,
  AboutIntro,
  AboutMedia,
  AboutSocial,
} from "@/components/about";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "За нас — SelectAuto",
  description:
    "В SelectAuto изграждаме сигурен, ясен и професионално управляван процес — от правилния избор до логистиката, регистрацията и финалното предаване.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-[#f4f5f7] text-[#18191c]">
        <AboutHero />
        <AboutIntro />
        <AboutFeatures />
        <AboutMedia />
        <AboutSocial />
        <AboutCta />
      </main>

      <SiteFooter />
    </>
  );
}
