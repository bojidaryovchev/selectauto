import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton, SectionHeading } from "@/components/common";
import { VinCheckTool } from "@/components/carfax";
import {
  ArrowRightIcon,
  FlagKrIcon,
  GaugeIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildWebApplicationJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /proverka-vin — the VIN / Carfax availability checker (docs/12-web-seo-strategy.md tools +
 * §3 cluster 4 "trust / verification"; only ~2 competitors offer a self-serve VIN
 * tool). The live `<VinCheckTool>` calls the FREE AuctionsAPI check-records lookup
 * via `/api/vin-check` (key stays server-side) and shows record availability; the
 * full (paid) report is a manual, lead-gated step through the Carfax form — so this
 * page is both a genuine utility AND a lead magnet, without exposing paid credits.
 *
 * Server component (SEO copy + FAQ + schema); only the tool is a client island.
 *
 * Look: boards `in-vin`, `in-vin-flow`, `in-vin-msgs` (the tool's states) and `in-vin-dlg`, `in-vin-carfax` (the
 * Carfax dialog); classes in styles/info-vin.css under the page's root class `.in-vin-pg`; parity check
 * docs/design/parity/proverka-vin.md.
 */

const PATH = "/proverka-vin";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  // „VIN проверка" (Latin VIN) is the demand-validated phrasing — the strongest,
  // fastest-growing tool keyword in the niche (docs/12-web-seo-strategy.md §3.4);
  // „безплатно" is its top modifier. Both lead the title.
  title: "VIN проверка на автомобил — безплатно | SelectAuto",
  description:
    "Безплатна проверка по VIN номер — вижте дали има Carfax / AutoCheck история (собственици, километри, инциденти) преди да купите. Заявете пълен доклад през SelectAuto.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "VIN проверка на автомобил — безплатно | SelectAuto",
    description:
      "Безплатна проверка по VIN номер + пълен Carfax доклад през SelectAuto. Вижте и как се проверява история на кола от Корея.",
    path: PATH,
  }),
};

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match rendered text). */
const FAQ: FaqEntry[] = [
  {
    question: "Какво показва проверката на VIN?",
    answer:
      "Показва колко Carfax и AutoCheck записи има за въведения VIN номер и разпознатия автомобил. Това е бърз начин да разберете дали има налична история, преди да поръчате пълния доклад.",
  },
  {
    question: "Безплатна ли е проверката?",
    answer:
      "Да. Проверката на наличността на записи е безплатна. Пълният Carfax доклад (с подробната история — собственици, километри, инциденти, записи) се заявява отделно през SelectAuto.",
  },
  {
    question: "Какво е VIN номер и къде да го намеря?",
    answer:
      "VIN (Vehicle Identification Number) е уникален 17-значен идентификатор на автомобила. Намира се в талона, на рамката на предното стъкло или на стойката на вратата на водача. Не съдържа буквите I, O и Q.",
  },
  {
    question: "Каква е разликата между Carfax и AutoCheck?",
    answer:
      "И двете са американски услуги за история на автомобил по VIN. Carfax е най-разпознаваемата, а AutoCheck (от Experian) предлага собствена оценка и покритие. За по-пълна картина е добре да се погледнат и двете.",
  },
  {
    question: "Може ли VIN проверка на кола от Корея?",
    answer:
      "Carfax и AutoCheck покриват основно автомобили от САЩ и Канада — кола, карана само в Корея, обикновено няма записи там. Историята на корейските автомобили се проверява през корейските регистри (Encar доклад): застрахователна история, брой собственици, щети и официален оглед. SelectAuto показва тези данни директно в обявите си от Корея и може да извади доклад за конкретен автомобил.",
  },
];

export default function VinCheckPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Проверка на VIN", url: PATH },
  ]);
  const webAppJsonLd = buildWebApplicationJsonLd({
    name: "VIN проверка на автомобил",
    description:
      "Безплатна онлайн проверка по VIN номер за налична история и записи в аукционните бази (Copart, IAAI, Encar).",
    url: PATH,
    category: "UtilitiesApplication",
  });

  return (
    <>
      <SiteHeader />
      <main className="in-vin-pg flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

        <section className="in-hero">
          <div className="sa-wrap">
            <nav className="sa-crumbs pt-[clamp(20px,2.4vw,32px)]" aria-label="Пътечка">
              <Link href="/">Начало</Link>
              <i aria-hidden="true">/</i>
              <span aria-current="page">Проверка на VIN</span>
            </nav>
          </div>
          <div className="sa-wrap in-hero__in">
            <div className="in-hero__copy">
              <h1 className="type-h1">Безплатна VIN проверка на автомобил</h1>
              <p className="sa-lead">
                Проверете безплатно по VIN номер дали за даден автомобил има налична история в Carfax и AutoCheck.
                Въведете VIN-а по-долу — ще видите броя записи и разпознатия автомобил. За пълния доклад с подробната
                история заявете Carfax през SelectAuto.
              </p>
            </div>
            {/* The live tool */}
            <VinCheckTool />
          </div>
        </section>

        {/* Why check */}
        <section className="sa-band">
          <div className="sa-wrap">
            <SectionHeading title="Защо да проверите VIN преди покупка" />
            <div className="sa-grid sa-grid--4">
              {[
                {
                  Icon: UsersIcon,
                  t: "История на собственост",
                  d: "Колко собственици е имал автомобилът и къде е бил регистриран.",
                },
                {
                  Icon: GaugeIcon,
                  t: "Реален пробег",
                  d: "Записи за километрите, които помагат да се засече върнат километраж.",
                },
                {
                  Icon: TriangleAlertIcon,
                  t: "Инциденти и щети",
                  d: "Данни за регистрирани катастрофи, тотални щети (salvage) и ремонти.",
                },
                {
                  Icon: ShieldCheckIcon,
                  t: "Спокойствие при внос",
                  d: "По-малко изненади при покупка от разстояние (Copart, IAAI, Encar).",
                },
              ].map(({ Icon, t, d }) => (
                <article key={t} className="sa-pnl in-why">
                  <span className="sa-pnl__ic">
                    <Icon />
                  </span>
                  <h3 className="type-h3">{t}</h3>
                  <p className="sa-p">{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Korea angle — „вин проверка корея" is real, unserved demand
            (docs/12-web-seo-strategy.md §3.4): Carfax doesn't cover Korean-
            domestic cars, and honestly explaining what DOES work is both the
            differentiator and the funnel into the Korea inventory. */}
        <section className="sa-band sa-band--s1">
          <div className="sa-wrap in-kr">
            <span className="in-kr__flag">
              <FlagKrIcon />
            </span>
            <div className="in-kr__b">
              <h2 className="type-h2">VIN проверка на кола от Корея</h2>
              <p className="sa-p text-[17px]">
                Carfax и AutoCheck покриват основно автомобили, карани в САЩ и Канада. Кола от корейския вътрешен
                пазар обикновено няма записи там — нейната история се проверява през корейските регистри: Encar доклад
                със застрахователна история, брой собственици, регистрирани щети и официален оглед на състоянието.
              </p>
              <p className="sa-p text-[17px]">
                При обявите от Корея в каталога на SelectAuto тези данни са показани директно на страницата на
                автомобила — история, застрахователни събития и протокол от огледа. За конкретен автомобил можем да
                извадим и пълния доклад.
              </p>
              <div className="sa-row">
                <LinkButton href="/vnos-na-koli-ot-korea" variant="sec">
                  Внос на коли от Корея
                </LinkButton>
                <LinkButton href="/vsichki-avtomobili?market=kr" variant="sec">
                  Коли от Корея в каталога
                  <ArrowRightIcon />
                </LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ (visible, every answer shown — matches the FAQPage JSON-LD) */}
        <section className="sa-band">
          <div className="sa-wrap">
            <SectionHeading title="Често задавани въпроси" />
            <div className="in-qa">
              {FAQ.map((f) => (
                <div key={f.question} className="sa-pnl">
                  <h3 className="type-h4">{f.question}</h3>
                  <p className="sa-p">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="sa-band sa-band--tight pt-0">
          <div className="sa-wrap">
            <div className="sa-pnl in-cta">
              <div className="in-cta__t">
                <h2 className="type-h2">Искате пълния Carfax доклад?</h2>
                <p className="sa-p">
                  Заявете подробна история на автомобила през SelectAuto — собственици, километри, инциденти и важни
                  записи преди да вземете решение.
                </p>
              </div>
              <LinkButton href="/carfax" variant="pri" size="xl">
                <ShieldCheckIcon />
                Заявете Carfax проверка
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
