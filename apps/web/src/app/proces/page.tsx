import type { Metadata } from "next";
import { ParticleProcess } from "@/components/three";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Процес — от заявка до ключ | SelectAuto",
  description:
    "Пет стъпки, един резултат. Вижте целия процес на SelectAuto — подбор, търг, оформяне, логистика и предаване на ключа — в интерактивна 3D анимация.",
};

export default function ProcessPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 text-ink">
        <ParticleProcess />
      </main>
      <SiteFooter />
    </>
  );
}
