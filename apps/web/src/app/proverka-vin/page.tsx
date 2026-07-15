import type { Metadata } from "next";
import Link from "next/link";
import { Container, LinkButton } from "@/components/common";
import { VinCheckTool } from "@/components/carfax";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type FaqEntry } from "@/lib/site-jsonld";

/**
 * /proverka-vin — the VIN / Carfax availability checker (docs/12-web-seo-strategy.md tools +
 * §3 cluster 4 "trust / verification"; only ~2 competitors offer a self-serve VIN
 * tool). The live `<VinCheckTool>` calls the FREE AuctionsAPI check-records lookup
 * via `/api/vin-check` (key stays server-side) and shows record availability; the
 * full (paid) report is a manual, lead-gated step through the Carfax form — so this
 * page is both a genuine utility AND a lead magnet, without exposing paid credits.
 *
 * Server component (SEO copy + FAQ + schema); only the tool is a client island.
 */

const PATH = "/proverka-vin";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  // „VIN проверка" (Latin VIN) is the demand-validated phrasing — the strongest,
  // fastest-growing tool keyword in the niche (docs/12-web-seo-strategy.md §3.4);
  // „безплатно" is its top modifier. Both lead the title.
  title: "VIN проверка на автомобил — безплатно | SelectAuto",
  description:
    "Безплатна проверка по VIN номер: виж дали има Carfax / AutoCheck история за автомобила (собственици, километри, инциденти) — включително какво важи за коли от Корея. Заяви пълен доклад през SelectAuto преди да купиш.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "VIN проверка на автомобил — безплатно | SelectAuto",
    description:
      "Безплатна проверка по VIN номер + пълен Carfax доклад през SelectAuto. Виж и как се проверява история на кола от Корея.",
    url: CANONICAL,
    type: "website",
  },
};

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match rendered text). */
const FAQ: FaqEntry[] = [
  {
    question: "Какво показва проверката на VIN?",
    answer:
      "Показва колко Carfax и AutoCheck записи има за въведения VIN номер и разпознатия автомобил. Това е бърз начин да разбереш дали има налична история, преди да поръчаш пълния доклад.",
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

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <Container className="max-w-245 py-12 max-md:py-8">
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">Проверка на VIN</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Безплатна VIN проверка на автомобил
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Провери безплатно по VIN номер дали за даден автомобил има налична история в Carfax и AutoCheck. Въведи
            VIN-а по-долу — ще видиш броя записи и разпознатия автомобил. За пълния доклад с подробната история заяви
            Carfax през SelectAuto.
          </p>

          {/* The live tool */}
          <section className="mb-12">
            <VinCheckTool />
          </section>

          {/* Why check */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Защо да провериш VIN преди покупка</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { t: "История на собственост", d: "Колко собственици е имал автомобилът и къде е бил регистриран." },
                { t: "Реален пробег", d: "Записи за километрите, които помагат да се засече върнат километраж." },
                { t: "Инциденти и щети", d: "Данни за регистрирани катастрофи, тотални щети (salvage) и ремонти." },
                { t: "Спокойствие при внос", d: "По-малко изненади при покупка от разстояние (Copart, IAAI, Encar)." },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink">{c.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{c.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Korea angle — „вин проверка корея" is real, unserved demand
              (docs/12-web-seo-strategy.md §3.4): Carfax doesn't cover Korean-
              domestic cars, and honestly explaining what DOES work is both the
              differentiator and the funnel into the Korea inventory. */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">VIN проверка на кола от Корея</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="mb-3 text-[15px]/relaxed text-[#3d4046]">
                Carfax и AutoCheck покриват основно автомобили, карани в САЩ и Канада. Кола от корейския вътрешен
                пазар обикновено няма записи там — нейната история се проверява през корейските регистри: Encar
                доклад със застрахователна история, брой собственици, регистрирани щети и официален оглед на
                състоянието.
              </p>
              <p className="mb-4 text-[15px]/relaxed text-[#3d4046]">
                При обявите от Корея в каталога на SelectAuto тези данни са показани директно на страницата на
                автомобила — история, застрахователни събития и протокол от огледа. За конкретен автомобил можем да
                извадим и пълния доклад.
              </p>
              <div className="flex flex-wrap gap-3">
                <LinkButton
                  href="/vnos-na-koli-ot-korea"
                  rippleTheme="dark"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink transition-colors hover:text-brand-dark"
                >
                  Внос на коли от Корея
                </LinkButton>
                <LinkButton
                  href="/vsichki-avtomobili?market=kr"
                  rippleTheme="dark"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink transition-colors hover:text-brand-dark"
                >
                  Коли от Корея в каталога
                </LinkButton>
              </div>
            </div>
          </section>

          {/* FAQ (visible — matches the FAQPage JSON-LD) */}
          <section className="mb-12">
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
          <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш пълния Carfax доклад?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Заяви подробна история на автомобила през SelectAuto — собственици, километри, инциденти и важни записи
              преди да вземеш решение.
            </p>
            <LinkButton
              href="/carfax"
              rippleTheme="dark"
              className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-8 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
            >
              Заяви Carfax проверка
            </LinkButton>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
