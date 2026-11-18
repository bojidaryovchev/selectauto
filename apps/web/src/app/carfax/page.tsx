import type { Metadata } from "next";
import { CarfaxBar, CarfaxBenefits, CarfaxFormSection, CarfaxHero } from "@/components/carfax";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  // Targets the real Carfax brand demand in BG („carfax българия", „carfax
  // цена" — docs/12-web-seo-strategy.md §3.4): name the country and the price
  // question in the title/description instead of the generic „заявка".
  title: "Carfax проверка в България — поръчайте доклад | SelectAuto",
  description:
    "Поръчайте Carfax проверка от България на изгодна цена — пълна история на автомобила по VIN: пробег, инциденти, собственици и важни записи преди покупка.",
  alternates: { canonical: `${SITE_URL}/carfax` },
  ...buildSocialMeta({
    title: "Carfax проверка в България — поръчайте доклад | SelectAuto",
    description:
      "Carfax доклад от България — пробег, инциденти, собственици и важни записи, преди да вземете решение.",
    path: "/carfax",
  }),
};

const FORM_ID = "sa-carfax-form-block";
const ACTIONS_ID = "carfax-hero-actions";

/**
 * /carfax (boards `in-carfax`, `in-carfax-flow`, `in-carfax-msgs`; parity check docs/design/parity/carfax.md): the
 * hero, the three benefits, the inquiry form beside its info, and on phones and tablets a bar to the form. Its
 * classes are in styles/info-carfax.css under the page's root class `.in-carfax-pg` (the form's own, shared with the
 * dialog, in styles/info-carfax-form.css).
 */
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

      <main className="in-carfax-pg flex-1 pt-(--header-h)">
        <CarfaxHero actionsId={ACTIONS_ID} formId={FORM_ID} />
        <CarfaxBenefits />
        <CarfaxFormSection id={FORM_ID} />
        <CarfaxBar formId={FORM_ID} actionsId={ACTIONS_ID} />
      </main>

      <SiteFooter />
      {/* Room for the bar at the page's end (phones and tablets, with the bar). */}
      <div className="h-16.25 lg:hidden" aria-hidden="true" />
    </>
  );
}
