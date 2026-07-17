import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { CostEstimator, CostEstimatorFromUrl } from "@/components/calculator";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { RATES_VERIFIED_AT } from "@/data/import-rates";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildWebApplicationJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  title: "Калкулатор за внос на автомобил — колко струва | SelectAuto",
  description:
    "Изчисли ориентировъчната цена за внос на автомобил от Корея, САЩ или Канада — цена, аукционни такси, транспорт, мито, ДДС и регистрация.",
  alternates: { canonical: `${SITE_URL}/kalkulator` },
  ...buildSocialMeta({
    title: "Калкулатор за внос на автомобил — колко струва | SelectAuto",
    description:
      "Ориентировъчна цена за внос от Корея, САЩ или Канада — цена, такси, транспорт, мито, ДДС и регистрация.",
    path: "/kalkulator",
  }),
};

/**
 * /kalkulator — import-cost landing page + the v2 interactive estimator
 * (market-correct duty logic, itemized breakdown incl. екотакса/одобряване,
 * gated email-offer lead capture — docs/13-seo-action-plan.md Phase B). The
 * estimator is a client island seeded from `?market=&price=` (car-detail deep
 * links) via <CostEstimatorFromUrl>, whose `useSearchParams()` is isolated
 * behind Suspense so the page keeps its static shell; the fallback renders the
 * default estimator so nothing flashes empty. The page itself is a server
 * component holding the SEO copy + FAQ.
 */

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match the rendered text). */
const FAQ: FaqEntry[] = [
  {
    question: "Колко струва внос на кола от Америка или Корея?",
    answer:
      "Крайната цена се състои от цената на автомобила, аукционните такси, транспорта до България, митото и ДДС, екотаксата, одобряването (технотест) и таксите за регистрация. За автомобил на стойност около 15 000 € крайната сума обикновено е значително по-висока след добавяне на тези компоненти. Използвайте калкулатора по-горе за ориентир и се свържете с нас за точна оферта.",
  },
  {
    question: "Какво мито и ДДС се плащат при внос от трета страна?",
    answer:
      "При внос на лек автомобил от страна извън ЕС се дължи мито 10% върху стойността до България (цена + такси + транспорт) и ДДС 20% върху тази стойност плюс митото. Изключение: при внос от Корея митото е 0%, когато корейският износител издаде декларация за преференциален произход по Споразумението ЕС–Корея — без такава декларация се дължи пълното мито.",
  },
  {
    question: "Защо някои коли от Корея плащат 10% мито, а други 0%?",
    answer:
      "Нулевото мито по Споразумението ЕС–Корея важи само когато износителят е „одобрен износител“ и издаде декларация за произход върху фактурата (задължително за пратки над 6 000 €). Автомобил, купен на корейски аукцион без такава декларация, дължи пълното мито от 10%. Затова е важно вносът да мине през износител, който издава документа — попитайте ни за конкретния случай.",
  },
  {
    question: "Какво е екотакса и колко струва?",
    answer:
      "Екотаксата (продуктова такса за МПС) се заплаща еднократно към ПУДООС преди първата регистрация в КАТ. Размерът зависи от възрастта и задвижването на автомобила — например за бензинов/дизелов автомобил на възраст 5–10 години таксата е 290 лв (≈148 €), а над 10 години — 310 лв (≈159 €). Хибридите дължат по-ниски ставки.",
  },
  {
    question: "Калкулаторът дава ли точна крайна цена?",
    answer:
      "Не. Калкулаторът дава ориентировъчна разбивка по зададени от Вас стойности. Точните мита, ДДС, транспорт и такси зависят от конкретния автомобил, неговата стойност и актуалните тарифи. За обвързваща калкулация направете запитване и ще получите персонална оферта.",
  },
  {
    question: "Колко време отнема доставката?",
    answer:
      "Ориентировъчно: от Корея около 8–10 седмици (морският маршрут в момента минава покрай нос Добра надежда), от САЩ около 4–7 седмици и от Канада около 5–8 седмици — от покупката до пристигането в България, преди оформяне и регистрация.",
  },
];

export default function CalculatorPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Калкулатор за внос", url: "/kalkulator" },
  ]);
  const webAppJsonLd = buildWebApplicationJsonLd({
    name: "Калкулатор за внос на автомобил",
    description:
      "Онлайн калкулатор за ориентировъчна цена на внос от Корея, САЩ или Канада — цена, такси, транспорт, мито, ДДС и регистрация.",
    url: "/kalkulator",
    category: "FinanceApplication",
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
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

          {/* URL-seeded estimator (car-detail deep links): useSearchParams lives
              in the wrapper, so only this hole is dynamic; the fallback is the
              default estimator — visually identical when no params are set. */}
          <Suspense fallback={<CostEstimator />}>
            <CostEstimatorFromUrl />
          </Suspense>

          <p className="mt-3 text-xs text-muted">
            Всички суми са в щатски долари ($). Ставките (мито, ДДС) са проверени към {RATES_VERIFIED_AT}.
          </p>

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
                  d: "Мито 10% върху стойността до България и ДДС 20% върху стойността плюс митото. От Корея митото е 0% при декларация за преференциален произход от одобрен износител.",
                },
                {
                  t: "Екотакса (ПУДООС)",
                  d: "Еднократна продуктова такса преди първата регистрация — по възраст и задвижване (напр. 290 лв за бензин/дизел на 5–10 г.).",
                },
                {
                  t: "Одобряване и адаптация",
                  d: "Индивидуално одобряване (технотест) за автомобили без ЕС одобрение на типа; за САЩ/Канада — и адаптация (светлини, km/h скоростомер).",
                },
                {
                  t: "Регистрация и такси",
                  d: "ГТП, такси на КАТ и табели — финалните стъпки до регистрацията.",
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

          {/* Contextual links into the money pages (the FAQ hub links here;
              this closes the loop — docs/12-web-seo-strategy.md §7). */}
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Полезни страници</h2>
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
              {[
                { label: "Внос на коли от Корея", href: "/vnos-na-koli-ot-korea" },
                { label: "Внос на коли от САЩ", href: "/vnos-na-koli-ot-sasht" },
                { label: "Внос на коли от Канада", href: "/vnos-na-koli-ot-kanada" },
                { label: "Проверка на VIN", href: "/proverka-vin" },
                { label: "Често задавани въпроси", href: "/chesto-zadavani-vaprosi" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-card transition-colors hover:text-brand-dark"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section className="mt-12 rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш точна оферта?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Кажи ни марка, модел и бюджет — ще изготвим персонална калкулация за конкретния автомобил, без скрити
              такси.
            </p>
            <InquiryButton
              rippleTheme="dark"
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
