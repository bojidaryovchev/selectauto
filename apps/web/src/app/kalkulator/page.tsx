import type { Metadata } from "next";
import { Container } from "@/components/common";
import { CostEstimator } from "@/components/calculator";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildFaqJsonLd, type FaqEntry } from "@/lib/site-jsonld";

export const metadata: Metadata = {
  title: "Калкулатор за внос на автомобил — колко струва | SelectAuto",
  description:
    "Изчисли ориентировъчната цена за внос на автомобил от Корея, САЩ или Канада — цена, аукционни такси, транспорт, мито, ДДС и регистрация. Прозрачна разбивка и точна оферта от SelectAuto.",
  alternates: { canonical: `${SITE_URL}/kalkulator` },
};

/**
 * /kalkulator — import-cost landing page + interactive estimator. Fixes a dead
 * footer link (`FOOTER_INFO` pointed here with no route) and targets the
 * high-conversion "колко струва внос" cost cluster (docs/12-web-seo-strategy.md cluster #2).
 * The interactive `<CostEstimator>` is a client island; the page itself is a
 * server component holding the SEO copy + FAQ. A full itemized multi-country
 * calculator with a gated PDF estimate is the Phase-1 upgrade of this page.
 */

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match the rendered text). */
const FAQ: FaqEntry[] = [
  {
    question: "Колко струва внос на кола от Америка или Корея?",
    answer:
      "Крайната цена се състои от цената на автомобила, аукционните такси, транспорта до България, митото и ДДС, и таксите за регистрация. За автомобил на стойност около 15 000 € крайната сума обикновено е значително по-висока след добавяне на тези компоненти. Използвайте калкулатора по-горе за ориентир и се свържете с нас за точна оферта.",
  },
  {
    question: "Какво мито и ДДС се плащат при внос от трета страна?",
    answer:
      "При внос на лек автомобил от страна извън ЕС (САЩ, Канада, Корея) обикновено се дължи мито върху стойността до България и ДДС върху сумата от стойността и митото. Точните ставки зависят от конкретния случай и текущите тарифи — калкулаторът използва типични стойности, които можете да коригирате.",
  },
  {
    question: "Калкулаторът дава ли точна крайна цена?",
    answer:
      "Не. Калкулаторът дава ориентировъчна разбивка по зададени от Вас стойности. Точните мита, ДДС, транспорт и такси зависят от конкретния автомобил, неговата стойност и актуалните тарифи. За обвързваща калкулация направете запитване и ще получите персонална оферта.",
  },
  {
    question: "Какво включва транспортът?",
    answer:
      "Транспортът покрива доставката на автомобила от аукциона до България (морски/контейнерен превоз и сухопътна логистика). Стойността зависи от пазара на произход и текущите навла.",
  },
];

export default function CalculatorPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <Container className="max-w-245 py-12 max-md:py-8">
          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Калкулатор за внос на автомобил
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Вносът на автомобил от Корея, САЩ или Канада се състои от няколко ясни компонента. С калкулатора по-долу
            получавате ориентировъчна разбивка по зададени от Вас стойности. За обвързваща, точна оферта направете
            запитване — изготвяме персонална калкулация за конкретния автомобил.
          </p>

          <CostEstimator />

          {/* Cost-component explainer (real, indexable content) */}
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-black text-ink">От какво се състои крайната цена</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                {
                  t: "Цена на автомобила",
                  d: "Сумата, на която печелите автомобила на аукциона (Copart, IAAI, Encar) или цената Buy Now.",
                },
                {
                  t: "Аукционни такси",
                  d: "Таксите на аукционната площадка и обработка на сделката.",
                },
                {
                  t: "Транспорт до България",
                  d: "Морски/контейнерен превоз и сухопътна логистика от пазара на произход.",
                },
                {
                  t: "Мито и ДДС",
                  d: "При внос от страна извън ЕС се начисляват мито и ДДС върху стойността до България.",
                },
                {
                  t: "Регистрация и такси",
                  d: "Местни такси, оформяне на документи и регистрация в КАТ.",
                },
                {
                  t: "Проверка на история",
                  d: "По желание — Carfax / проверка на VIN, за да сте сигурни в състоянието на автомобила.",
                },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink">{c.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{c.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ (visible — matches the FAQPage JSON-LD) */}
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Често задавани въпроси</h2>
            <div className="flex flex-col gap-4">
              {FAQ.map((f) => (
                <div key={f.question} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-base font-extrabold text-ink">{f.question}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-12 rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш точна оферта?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Кажи ни марка, модел и бюджет — ще изготвим персонална калкулация за конкретния автомобил, без скрити
              такси.
            </p>
            <InquiryButton
              rippleTheme="light"
              className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-8 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
            >
              Направи запитване
            </InquiryButton>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
