import type { Metadata } from "next";
import { ParticleProcess } from "@/components/three";
import { ProcessSteps } from "@/components/process";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Процес — от заявка до ключ | SelectAuto",
  description:
    "Пет стъпки, един резултат. Вижте целия процес на SelectAuto — подбор, търг, оформяне, логистика и предаване на ключа — в интерактивна 3D анимация.",
  alternates: { canonical: `${SITE_URL}/proces` },
  openGraph: {
    title: "Процес — от заявка до ключ | SelectAuto",
    description:
      "Пет стъпки, един резултат — подбор, търг, оформяне, логистика и предаване на ключа.",
    url: `${SITE_URL}/proces`,
  },
};

export default function ProcessPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 text-ink">
        <ParticleProcess />
        {/* Crawlable, server-rendered process content (the canvas above is
            JS-gated/animated → not reliably indexable). Holds the page's <h1>. */}
        <ProcessSteps />
      </main>
      <SiteFooter />
    </>
  );
}
