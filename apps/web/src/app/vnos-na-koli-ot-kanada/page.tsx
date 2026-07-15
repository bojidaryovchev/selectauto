import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Container } from "@/components/common";
import { CostEstimator } from "@/components/calculator";
import { AuctionCard } from "@/components/cars/all-cars";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { getCarsPage } from "@/queries/cars";

/**
 * /vnos-na-koli-ot-kanada — the Canada country hub (docs/12-web-seo-strategy.md §4.2).
 * Targets „внос на коли от Канада" + the trust/cost clusters, links into the CA
 * inventory (market=ca) + calculator.
 *
 * Copy is FACT-CHECKED (2026), and deliberately HONEST about the rust caveat: the
 * common "Canada = rust-free" claim is NOT reliably true — Canadian cars driven
 * year-round see winter road salt (esp. eastern provinces/Quebec), so the real
 * Canada advantage is Carfax TRANSPARENCY (covers every Canadian province) + clean
 * history, with an explicit underbody/rust check — not a rust-free guarantee. Same
 * 10% duty + 20% VAT structure as the other hubs. See the Korea hub for the shared
 * pattern.
 */

const PATH = "/vnos-na-koli-ot-kanada";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Внос на коли от Канада — Carfax, прозрачна история | SelectAuto",
  description:
    "Внос на автомобили от Канада с SelectAuto — пълна история през Carfax (всяка провинция), проверка на състояние и корозия, транспорт, мито и ДДС, регистрация в КАТ. Ясна разбивка на разходите. Виж активни обяви.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Внос на коли от Канада | SelectAuto",
    description: "Carfax история, проверка на състояние, пълно съдействие до регистрация в КАТ.",
    url: CANONICAL,
    type: "website",
  },
};

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match rendered text). */
const FAQ: FaqEntry[] = [
  {
    question: "Защо да внеса кола от Канада?",
    answer:
      "Канадският пазар предлага автомобили с добра прозрачност на историята — всяка провинция се покрива от Carfax (собственици, километри, инциденти, регистрации). Цените често са конкурентни, а изборът е добър, особено за автомобили с чиста история.",
  },
  {
    question: "Вярно ли е, че канадските коли нямат ръжда?",
    answer:
      "Не винаги. Канадските коли, карани целогодишно, виждат зимна сол по пътищата (особено в източните провинции и Квебек), което може да доведе до корозия. Затова проверяваме конкретния автомобил — история и състояние на купето/долницата — вместо да разчитаме на общото твърдение, че „канадска = без ръжда“.",
  },
  {
    question: "Колко струва внос на кола от Канада?",
    answer:
      "При внос от страна извън ЕС се дължат мито 10% и ДДС 20%: митото върху стойността плюс транспорта, а ДДС върху стойността, транспорта и митото. Добавят се аукционни такси и регистрация. Използвайте калкулатора по-горе за ориентир; за обвързваща оферта направете запитване.",
  },
  {
    question: "Как проверявате историята на канадска кола?",
    answer:
      "Чрез Carfax по VIN номер — докладът включва собственици, километри, инциденти, регистрации и маркери като salvage/rebuilt. Canadian Carfax обхваща всяка провинция, което прави проверката надеждна преди наддаване.",
  },
  {
    question: "Колко време отнема вносът от Канада?",
    answer:
      "Обичайно няколко седмици от избора на автомобила до готовност за регистрация в КАТ — според транспорта (морски превоз + сухопътна логистика) и оформянето на документите.",
  },
];

/** Why-Canada pillars (fact-checked, honest on rust). */
const REASONS: { t: string; d: string }[] = [
  {
    t: "Прозрачна история (Carfax)",
    d: "Всяка канадска провинция се покрива от Carfax — собственици, километри, инциденти, регистрации.",
  },
  {
    t: "Добър избор с чиста история",
    d: "Много автомобили идват от редовна експлоатация с проследима история, а не от щети.",
  },
  {
    t: "Конкурентни цени",
    d: "С правилен подбор канадските коли често излизат изгодно спрямо европейския пазар.",
  },
  {
    t: "Проверка на корозия",
    d: "Зимната сол може да причини ръжда — проверяваме състоянието на долницата за конкретния автомобил.",
  },
];

/** Five process steps (shared narrative with /proces). */
const STEPS: { n: string; t: string; d: string }[] = [
  { n: "1", t: "Подбор", d: "Избираме подходящи канадски автомобили според бюджета и изискванията." },
  { n: "2", t: "Проверка", d: "Проверяваме Carfax история и състояние (вкл. корозия) преди решение." },
  { n: "3", t: "Наддаване / покупка", d: "Наддаваме за лота или използваме Buy Now оферта." },
  { n: "4", t: "Транспорт и оформяне", d: "Организираме превоза до България, митото, ДДС и документите." },
  { n: "5", t: "Предаване", d: "Автомобилът е готов за регистрация в КАТ и предаване на ключа." },
];

export default function CanadaHubPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Внос на коли от Канада", url: PATH },
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
            <span className="text-ink">Внос на коли от Канада</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Внос на коли от Канада
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Канада е силен пазар за автомобили с прозрачна история — Carfax покрива всяка провинция, а изборът на коли с
            чиста история е добър. SelectAuto поема целия процес: подбор, проверка на Carfax и състояние (включително
            корозия), наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ.
          </p>

          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Защо коли от Канада</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {REASONS.map((r) => (
                <div key={r.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink">{r.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{r.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Колко струва внос от Канада</h2>
            <p className="mb-5 max-w-2xl text-sm/relaxed text-[#3d4046]">
              Изчисли ориентировъчна разбивка: цена, аукционни такси, транспорт, мито (10%) и ДДС (20%), регистрация. За
              обвързваща оферта за конкретен автомобил направи запитване.
            </p>
            <CostEstimator defaultMarket="ca" />
          </section>

          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Процесът стъпка по стъпка</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <div className="mb-2 inline-flex size-8 items-center justify-center rounded-full bg-brand text-sm font-black text-white">
                    {s.n}
                  </div>
                  <h3 className="mb-1 text-base font-extrabold text-ink">{s.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{s.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-black text-ink">Актуални коли от Канада</h2>
              <Link
                href="/vsichki-avtomobili?market=ca"
                className="whitespace-nowrap text-sm font-bold text-brand-dark hover:underline"
              >
                Виж всички →
              </Link>
            </div>
            <Suspense fallback={<FeaturedSkeleton />}>
              <FeaturedCanadaCars />
            </Suspense>
          </section>

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

          <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш кола от Канада?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Кажи ни марка, модел и бюджет — ще подберем подходящи автомобили с чиста история и ще изготвим персонална
              калкулация, без скрити такси.
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

/** Server island: first few active CA listings (market=ca). */
async function FeaturedCanadaCars() {
  // See the Korea hub: opt this streamed island into request-time rendering so the
  // Drizzle `randomBytes` call doesn't trip the prerender-random guard and fail the
  // build. The shell stays static; the listings stream behind the skeleton.
  await connection();
  const page = await getCarsPage({ market: "ca" }, null);
  const cars = page.cars.slice(0, 6);
  if (cars.length === 0) {
    return (
      <p className="text-sm text-muted">
        В момента няма активни обяви за коли от Канада. Заяви персонална селекция и ще намерим подходящ автомобил.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <AuctionCard key={car.href} car={car} />
      ))}
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="aspect-4/3 w-full animate-pulse rounded-2xl bg-line" />
      ))}
    </div>
  );
}
