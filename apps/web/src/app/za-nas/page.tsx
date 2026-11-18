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
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  title: "За нас — внос на автомобили от Корея, САЩ и Канада | SelectAuto",
  description:
    "В SelectAuto изграждаме сигурен, ясен и професионално управляван процес — от правилния избор до логистиката, регистрацията и финалното предаване.",
  alternates: { canonical: `${SITE_URL}/za-nas` },
  ...buildSocialMeta({
    title: "За нас — SelectAuto",
    description:
      "Сигурен, ясен и професионално управляван процес по внос — от избора до финалното предаване.",
    path: "/za-nas",
  }),
};

/**
 * /za-nas (board `in-za-nas`; parity check docs/design/parity/za-nas.md): the video hero, who we are, the figures,
 * the five steps, the values and the closing panel. Its classes are in styles/info-za-nas.css under the page's root
 * class `.in-za-nas-pg`.
 */
export default function AboutPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "За нас", url: "/za-nas" },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteHeader />

      <main className="in-za-nas-pg flex-1 pt-(--header-h)">
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
