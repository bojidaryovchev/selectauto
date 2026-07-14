import type { Metadata } from "next";
import {
  ContactCards,
  ContactCta,
  ContactHero,
  ContactMap,
} from "@/components/contacts";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildLocalBusinessJsonLd } from "@/lib/site-jsonld";

export const metadata: Metadata = {
  title: "Контакти — SelectAuto",
  description:
    "Свържете се с нас бързо и лесно – ние сме тук, за да ви съдействаме! Телефон, адрес в гр. Пловдив, работно време и форма за безплатна консултация.",
  alternates: { canonical: `${SITE_URL}/kontakti` },
};

export default function ContactsPage() {
  // LocalBusiness/AutoDealer with full NAP + geo + hours — the contacts page is
  // the canonical home for the physical-location signal (same entity as the
  // site-wide org via @id). Reads verified NAP from constants.
  const localBusinessJsonLd = buildLocalBusinessJsonLd();

  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-[#f4f5f7] text-[#191b20]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        {/* Dark spacer so the fixed header sits above the hero image, not on it. */}
        <div className="h-(--header-h) bg-shell" />
        <ContactHero />
        <ContactCards />
        <ContactMap />
        <ContactCta />
      </main>

      <SiteFooter />
    </>
  );
}
