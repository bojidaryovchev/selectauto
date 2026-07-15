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
 * /vnos-na-koli-ot-korea — the KOREA country hub (docs/12-web-seo-strategy.md §4.2, the
 * FLAGSHIP money page: Korea is the winnable differentiator on the BG market).
 * Targets the transactional head term „внос на коли от Корея" + the trust/cost
 * clusters, and is a durable, crawlable link surface into the Korea inventory
 * (market=kr) and the calculator.
 *
 * Server component (SEO copy + FAQ + schema); the estimator is a client island
 * pre-set to Korea. Featured Korea listings stream inside <Suspense> (the DB read
 * is request data under Cache Components — same pattern as the catalog/hubs).
 *
 * ⚠️ COPY REVIEW: the pillar/FAQ text makes claims about Korean imports (Encar,
 * газ/LPI, duty/VAT, timelines). It is written CONSERVATIVELY (hedged, "обикновено"/
 * "ориентировъчно", no hard guarantees) and mirrors the calculator/process pages,
 * but the rates/specifics should be verified against current tariffs before this is
 * treated as authoritative marketing.
 */

const PATH = "/vnos-na-koli-ot-korea";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Внос на коли от Корея — Encar, газ/LPI, изгодни цени | SelectAuto",
  description:
    "Внос на автомобили от Корея с SelectAuto — подбор от Encar, проверка на история, транспорт, мито и ДДС, регистрация в КАТ. Корейските коли често са на газ/LPI, с ниски километри и добро оборудване. Виж активни обяви и заяви оферта.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Внос на коли от Корея | SelectAuto",
    description: "Encar подбор, проверка на история, пълно съдействие до регистрация в КАТ.",
    url: CANONICAL,
    type: "website",
  },
};

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match the rendered text).
 *  Self-contained, citable answers = the AI-Overview/Perplexity play (§6). */
const FAQ: FaqEntry[] = [
  {
    question: "Защо да внеса кола от Корея?",
    answer:
      "Корейският пазар предлага автомобили с относително ниски километри, добро оборудване и прозрачна история през платформи като Encar. Много коли са на газ (LPI) — икономичен вариант за българските условия. За разлика от някои западни пазари, тук голяма част от колите не идват от щети, а от редовна експлоатация.",
  },
  {
    question: "Какво е Encar и защо е важно?",
    answer:
      "Encar е най-голямата корейска платформа за обяви на автомобили втора употреба. Чрез нея се проверяват историята, диагностиката и снимковият материал на конкретния автомобил преди наддаване, което намалява риска при внос от разстояние.",
  },
  {
    question: "Колко струва внос на кола от Корея?",
    answer:
      "Крайната цена включва цената на автомобила, аукционните/платформените такси, транспорта до България, митото и ДДС при внос от страна извън ЕС, и таксите за регистрация. Използвайте калкулатора по-горе за ориентировъчна разбивка; за обвързваща оферта направете запитване за конкретен автомобил.",
  },
  {
    question: "Какво означава кола на газ / LPI от Корея?",
    answer:
      "LPI (Liquid Propane Injection) е фабрична газова система на Hyundai и Kia, много разпространена в Корея — среща се например при Sonata, Avante и K5. Такива автомобили са икономични в експлоатация. Важно е системата и документите ѝ да се проверят и да отговарят на изискванията за регистрация в България — съдействаме с проверката.",
  },
  {
    question: "Колко време отнема вносът от Корея?",
    answer:
      "Обичайно процесът отнема няколко седмици от спечелването/избора на автомобила до готовност за регистрация в КАТ — според транспорта и оформянето на документите. Точният срок зависи от конкретния случай.",
  },
];

/** Why-Korea pillars (real, indexable content). */
const REASONS: { t: string; d: string }[] = [
  {
    t: "Ниски километри и добро състояние",
    d: "Голяма част от корейските автомобили са с редовна експлоатация и грижа — не от щети или наводнения.",
  },
  {
    t: "Газ / LPI — икономична експлоатация",
    d: "Фабрични газови системи (LPI) са често срещани и намаляват разходите за гориво.",
  },
  {
    t: "Прозрачна история през Encar",
    d: "Проверка на диагностика, снимки и история преди наддаване — по-малко изненади при внос от разстояние.",
  },
  {
    t: "Добро оборудване за парите",
    d: "Корейските версии често идват с богато оборудване спрямо цената.",
  },
];

/** The five process steps, mirrored from the /proces narrative. */
const STEPS: { n: string; t: string; d: string }[] = [
  { n: "1", t: "Подбор", d: "Избираме подходящи автомобили от Encar според бюджета и изискванията." },
  { n: "2", t: "Проверка", d: "Проверяваме история, диагностика и снимки преди решение." },
  { n: "3", t: "Наддаване / покупка", d: "Печелим автомобила на аукцион или през Buy Now оферта." },
  { n: "4", t: "Транспорт и оформяне", d: "Организираме превоза до България, митото, ДДС и документите." },
  { n: "5", t: "Предаване", d: "Автомобилът е готов за регистрация в КАТ и предаване на ключа." },
];

export default function KoreaHubPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Внос на коли от Корея", url: PATH },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <Container className="max-w-245 py-12 max-md:py-8">
          {/* Breadcrumb */}
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">Внос на коли от Корея</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Внос на коли от Корея
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Корея е един от най-изгодните пазари за внос на автомобили — коли с ниски километри, добро оборудване и
            прозрачна история през Encar, често на газ (LPI). SelectAuto поема целия процес: подбор, проверка на
            история, наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ.
          </p>

          {/* Why Korea */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Защо коли от Корея</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {REASONS.map((r) => (
                <div key={r.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink">{r.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{r.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Calculator, preset to Korea */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Колко струва внос от Корея</h2>
            <p className="mb-5 max-w-2xl text-sm/relaxed text-[#3d4046]">
              Изчисли ориентировъчна разбивка на разходите за внос от Корея. За обвързваща оферта за конкретен
              автомобил направи запитване.
            </p>
            <CostEstimator defaultMarket="kr" />
          </section>

          {/* Process */}
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

          {/* Featured Korea listings (streamed) */}
          <section className="mb-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-black text-ink">Актуални коли от Корея</h2>
              <Link
                href="/vsichki-avtomobili/?market=kr"
                className="whitespace-nowrap text-sm font-bold text-brand-dark hover:underline"
              >
                Виж всички →
              </Link>
            </div>
            <Suspense fallback={<FeaturedSkeleton />}>
              <FeaturedKoreaCars />
            </Suspense>
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
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш кола от Корея?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Кажи ни марка, модел и бюджет — ще подберем подходящи автомобили от Encar и ще изготвим персонална
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

/** Server island: the first few active Korea listings (market=kr). Its own
 *  Suspense boundary keeps the static content above from blocking on the DB read. */
async function FeaturedKoreaCars() {
  // Opt this island into request-time (dynamic) rendering. Under `cacheComponents`
  // Next tries to prerender inside the Suspense boundary too, and the Drizzle/Neon
  // read calls `randomBytes` (prepared-statement id) before any request/uncached
  // data is read — which the prerender-random guard rejects and fails the build.
  // Reading `connection()` first marks this subtree dynamic (it already streams
  // behind a skeleton), so the shell stays static and the listings stream.
  await connection();
  const page = await getCarsPage({ market: "kr" }, null);
  const cars = page.cars.slice(0, 6);
  if (cars.length === 0) {
    return (
      <p className="text-sm text-muted">
        В момента няма активни обяви за коли от Корея. Заяви персонална селекция и ще намерим подходящ автомобил.
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

/** Placeholder while the featured listings stream in. */
function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="aspect-4/3 w-full animate-pulse rounded-2xl bg-line" />
      ))}
    </div>
  );
}
