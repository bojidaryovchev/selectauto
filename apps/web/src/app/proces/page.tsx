import type { Metadata } from "next";
import { ParticleProcess } from "@/components/three";
import { ProcessSteps } from "@/components/process";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  title: "Процес — от заявка до ключ | SelectAuto",
  description:
    "Пет стъпки, един резултат. Вижте целия процес на SelectAuto — подбор, търг, оформяне, логистика и предаване на ключа — в интерактивна 3D анимация.",
  alternates: { canonical: `${SITE_URL}/proces` },
  ...buildSocialMeta({
    title: "Процес — от заявка до ключ | SelectAuto",
    description:
      "Пет стъпки, един резултат — подбор, търг, оформяне, логистика и предаване на ключа.",
    path: "/proces",
  }),
};

/**
 * /proces (boards `in-proces`, `in-proces-flow`, `in-proces-nogl`; parity check docs/design/parity/proces.md): the
 * scroll-driven 3D process (or its static band without WebGL) and the written steps. Its classes are in
 * styles/info-proces.css under the page's root class `.in-proces-pg`.
 */
export default function ProcessPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Процес", url: "/proces" },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteHeader />
      {/* No top padding: the 3D intro is one screen tall and starts under the fixed header, as before. */}
      <main className="in-proces-pg flex-1">
        <ParticleProcess />
        {/* Crawlable, server-rendered process content (the canvas above is
            JS-gated/animated → not reliably indexable). Holds the page's <h1>. */}
        <ProcessSteps />
      </main>
      <SiteFooter />
    </>
  );
}
