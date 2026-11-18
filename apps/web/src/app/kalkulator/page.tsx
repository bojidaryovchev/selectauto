import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FaqAccordion, SectionHeading } from "@/components/common";
import { CostEstimator, CostEstimatorFromUrl } from "@/components/calculator";
import {
  CarIcon,
  ClipboardListIcon,
  FileCheckIcon,
  FileSearchIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  GavelIcon,
  InfoIcon,
  LandmarkIcon,
  MessageIcon,
  ReceiptIcon,
  SearchIcon,
  ShipIcon,
} from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { RATES_VERIFIED_AT } from "@/data/import-rates";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildWebApplicationJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  title: "Калкулатор за внос на автомобил — колко струва | SelectAuto",
  description:
    "Изчислете ориентировъчната цена за внос на автомобил от Корея, САЩ или Канада — цена, аукционни такси, транспорт, мито, ДДС и регистрация.",
  alternates: { canonical: `${SITE_URL}/kalkulator` },
  ...buildSocialMeta({
    title: "Калкулатор за внос на автомобил — колко струва | SelectAuto",
    description:
      "Ориентировъчна цена за внос от Корея, САЩ или Канада — цена, такси, транспорт, мито, ДДС и регистрация.",
    path: "/kalkulator",
  }),
};

/**
 * /kalkulator — import-cost landing page + the v2 interactive estimator (boards `im-calc*`; parity check
 * docs/design/parity/kalkulator.md)
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

/** „От какво се състои крайната цена": each cost component with its icon (board `im-calc`). */
const COST_PARTS = [
  {
    Icon: CarIcon,
    t: "Цена на автомобила",
    d: "Сумата, на която печелите автомобила на аукциона (Copart, IAAI, Encar) или цената Buy Now.",
  },
  { Icon: GavelIcon, t: "Аукционни такси", d: "Таксите на аукционната площадка и обработка на сделката." },
  {
    Icon: ShipIcon,
    t: "Транспорт до България",
    d: "Морски/контейнерен превоз и сухопътна логистика от пазара на произход.",
  },
  {
    Icon: LandmarkIcon,
    t: "Мито и ДДС",
    d: "Мито 10% върху стойността до България и ДДС 20% върху стойността плюс митото. От Корея митото е 0% при декларация за преференциален произход от одобрен износител.",
  },
  {
    Icon: ReceiptIcon,
    t: "Екотакса (ПУДООС)",
    d: "Еднократна продуктова такса преди първата регистрация — по възраст и задвижване (напр. 290 лв за бензин/дизел на 5–10 г.).",
  },
  {
    Icon: ClipboardListIcon,
    t: "Одобряване и адаптация",
    d: "Индивидуално одобряване (технотест) за автомобили без ЕС одобрение на типа; за САЩ/Канада — и адаптация (светлини, km/h скоростомер).",
  },
  {
    Icon: FileCheckIcon,
    t: "Регистрация и такси",
    d: "ГТП, такси на КАТ и табели — финалните стъпки до регистрацията.",
  },
  {
    Icon: FileSearchIcon,
    t: "Проверка на история",
    d: "По желание — Carfax / проверка на VIN, за да сте сигурни в състоянието на автомобила.",
  },
];

/** Contextual links into the money pages (the FAQ hub links here; this closes the loop — docs/12-web-seo-strategy.md §7). */
const USEFUL_PAGES = [
  { label: "Внос на коли от Корея", href: "/vnos-na-koli-ot-korea", Icon: FlagKrIcon, flag: true },
  { label: "Внос на коли от САЩ", href: "/vnos-na-koli-ot-sasht", Icon: FlagUsIcon, flag: true },
  { label: "Внос на коли от Канада", href: "/vnos-na-koli-ot-kanada", Icon: FlagCaIcon, flag: true },
  { label: "Проверка на VIN", href: "/proverka-vin", Icon: SearchIcon, flag: false },
  { label: "Често задавани въпроси", href: "/chesto-zadavani-vaprosi", Icon: MessageIcon, flag: false },
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
      <main className="flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

        <section className="sa-band sa-band--tight im-hero">
          <div className="sa-wrap">
            {/* The breadcrumb its JSON-LD already describes, now visible. */}
            <nav className="sa-crumbs" aria-label="Пътечка">
              <Link href="/">Начало</Link>
              <i aria-hidden="true">/</i>
              <span aria-current="page">Калкулатор за внос</span>
            </nav>
            <div className="im-hero__g im-hero__g--1">
              <div className="im-hero__t">
                <h1 className="type-h1">Калкулатор за внос на автомобил</h1>
                <p className="sa-lead">
                  Вносът на автомобил от Корея, САЩ или Канада се състои от няколко ясни компонента. С калкулатора
                  по-долу получавате ориентировъчна разбивка по зададени от Вас стойности. За обвързваща, точна оферта
                  направете запитване — изготвяме персонална калкулация за конкретния автомобил.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sa-band sa-band--tight">
          <div className="sa-wrap">
            {/* URL-seeded estimator (car-detail deep links): useSearchParams lives in the wrapper, so only this hole is
                dynamic; the fallback is the default estimator — visually identical when no params are set. */}
            <Suspense fallback={<CostEstimator />}>
              <CostEstimatorFromUrl />
            </Suspense>

            <p className="im-note im-small">
              <InfoIcon className="im-inl inline" />
              Всички суми са в щатски долари ($). Ставките (мито, ДДС) са проверени към {RATES_VERIFIED_AT}.
            </p>
          </div>
        </section>

        {/* Cost-component explainer (real, indexable content) */}
        <section className="sa-band sa-band--tight sa-band--line">
          <div className="sa-wrap">
            <SectionHeading title="От какво се състои крайната цена" />
            <div className="sa-grid sa-grid--4">
              {COST_PARTS.map(({ Icon, t, d }) => (
                <article key={t} className="im-card">
                  <div className="im-card__h">
                    <span className="im-ic">
                      <Icon />
                    </span>
                    <h3>{t}</h3>
                  </div>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ (the kit accordion; the answers stay in the page, matching the FAQPage JSON-LD) */}
        <section className="sa-band sa-band--tight sa-band--line">
          <div className="sa-wrap">
            <SectionHeading title="Често задавани въпроси" />
            <FaqAccordion items={FAQ} />
          </div>
        </section>

        <section className="sa-band sa-band--tight sa-band--line">
          <div className="sa-wrap">
            <div className="im-end">
              <div>
                <SectionHeading title="Полезни страници" />
                <nav className="sa-chips" aria-label="Полезни страници">
                  {USEFUL_PAGES.map(({ label, href, Icon, flag }) => (
                    <Link key={href} href={href} className="sa-chip">
                      <Icon className={flag ? "sa-flag" : undefined} />
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="im-cta">
                <div className="im-cta__t">
                  <h2 className="type-h2">Искате точна оферта?</h2>
                  <p className="sa-lead">
                    Кажете ни марка, модел и бюджет — ще изготвим персонална калкулация за конкретния автомобил, без
                    скрити такси.
                  </p>
                </div>
                <InquiryButton variant="pri" size="xl">
                  Направете запитване
                </InquiryButton>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
