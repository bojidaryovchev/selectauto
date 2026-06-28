import type { Metadata } from "next";
import {
  ContactCards,
  ContactCta,
  ContactHero,
  ContactMap,
} from "@/components/contacts";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Контакти — SelectAuto",
  description:
    "Свържете се с нас бързо и лесно – ние сме тук, за да ви съдействаме! Телефон, адрес в гр. Пловдив, работно време и форма за безплатна консултация.",
};

export default function ContactsPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-[#f4f5f7] text-[#191b20]">
        <ContactHero />
        <ContactCards />
        <ContactMap />
        <ContactCta />
      </main>

      <SiteFooter />
    </>
  );
}
