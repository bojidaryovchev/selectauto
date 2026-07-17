import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Container, LinkButton } from "@/components/common";
import { CostEstimator } from "@/components/calculator";
import { AuctionCard } from "@/components/cars/all-cars";
import { InquiryButton } from "@/components/inquiry";
import { HubTestimonials } from "@/components/hubs";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { RATES_VERIFIED_AT } from "@/data/import-rates";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildServiceJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";
import { getCarsPage } from "@/queries/cars";

/**
 * /vnos-na-koli-ot-korea — the KOREA country hub (docs/12-web-seo-strategy.md §4.2, the
 * FLAGSHIP money page: Korea is the demand-validated differentiator on the BG
 * market — autocomplete #1 for „внос на коли от", fastest-growing country term).
 * Deepened to a full pillar (docs/13-seo-action-plan.md Phase B): the
 * origin-declaration duty story, Encar history verification (the mileage-
 * authenticity objection), LPI/газ, parts availability, honest 2026 transit
 * times, post-arrival steps (одобряване/екотакса/КАТ), city coverage,
 * testimonials, and comparison links to the USA/Canada hubs.
 *
 * Server component (SEO copy + FAQ + schema); the estimator is a client island
 * pre-set to Korea. Featured Korea listings + testimonials stream inside
 * <Suspense> (the DB/Places reads are request data under Cache Components).
 *
 * ⚠️ COPY REVIEW: the pillar/FAQ text makes claims about Korean imports (Encar,
 * газ/LPI, duty/VAT, timelines). Written CONSERVATIVELY (hedged, „обикновено"/
 * „ориентировъчно") and aligned with the verified regulatory pack in
 * data/import-rates.ts (rates stamped {RATES_VERIFIED_AT}); re-verify quarterly.
 */

const PATH = "/vnos-na-koli-ot-korea";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Внос на коли от Корея — Encar, газ/LPI, изгодни цени | SelectAuto",
  description:
    "Внос на автомобили от Корея с SelectAuto — Encar подбор, проверка на история, транспорт, мито и ДДС, регистрация в КАТ. Реални километри, газ/LPI, оборудване.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "Внос на коли от Корея | SelectAuto",
    description: "Encar подбор, проверка на история, пълно съдействие до регистрация в КАТ.",
    path: PATH,
  }),
};

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match the rendered text).
 *  Self-contained, citable answers = the AI-Overview/Perplexity play (§6). The
 *  questions mirror the real ones Bulgarian SERPs show for Korea-import queries
 *  (mileage authenticity, parts, LPI, срок, мито). */
const FAQ: FaqEntry[] = [
  {
    question: "Защо да внеса кола от Корея?",
    answer:
      "Корейският пазар предлага автомобили с относително ниски километри, добро оборудване и прозрачна история през платформи като Encar. Много коли са на газ (LPI) — икономичен вариант за българските условия. За разлика от някои западни пазари, тук голяма част от колите не идват от щети, а от редовна експлоатация.",
  },
  {
    question: "Реални ли са километрите на колите от Корея?",
    answer:
      "В повечето случаи — да, и това е проверимо. В Корея пробегът се записва при официалните прегледи и в застрахователната история, а Encar докладът за конкретния автомобил показва тези записи заедно с брой собственици, регистрирани щети и протокол от оглед. Несъответствията се виждат в историята — затова проверяваме доклада преди каквото и да е наддаване.",
  },
  {
    question: "Кога митото от Корея е 0% и кога 10%?",
    answer:
      "По Споразумението за свободна търговия ЕС–Корея митото е 0%, когато корейският износител е „одобрен износител“ и издаде декларация за преференциален произход (задължителна за пратки над 6 000 €). Без такава декларация се дължи стандартното мито от 10%. Затова е важно вносът да мине през износител, който издава документа — калкулаторът по-горе показва разликата за конкретен бюджет.",
  },
  {
    question: "Какво е Encar и защо е важно?",
    answer:
      "Encar е най-голямата корейска платформа за обяви на автомобили втора употреба. Чрез нея се проверяват историята, диагностиката и снимковият материал на конкретния автомобил преди наддаване, което намалява риска при внос от разстояние.",
  },
  {
    question: "Колко струва внос на кола от Корея?",
    answer:
      "Крайната цена включва цената на автомобила, платформените такси, транспорта до България, митото (0% или 10% според декларацията за произход) и ДДС 20%, екотаксата, одобряването (технотест) и таксите за регистрация. Използвайте калкулатора по-горе за ориентировъчна разбивка; за обвързваща оферта направете запитване за конкретен автомобил.",
  },
  {
    question: "Какво означава кола на газ / LPI от Корея?",
    answer:
      "LPI (Liquid Propane Injection) е фабрична газова система на Hyundai и Kia, много разпространена в Корея — среща се например при Sonata, Grandeur и K5. Фабричната система е проектирана заедно с двигателя, а не монтирана допълнително, и прави експлоатацията осезаемо по-евтина. Важно е системата и документите ѝ да се проверят и да отговарят на изискванията за регистрация в България — съдействаме с проверката.",
  },
  {
    question: "Има ли части и сервиз за корейските коли в България?",
    answer:
      "Да. Hyundai и Kia са сред най-продаваните марки в България — модели като Tucson и Sportage са в топ 10 на новите регистрации, затова части и сервизна база има широко достъпни. Корейските версии на масовите модели споделят голяма част от механиката с европейските, а специфични части се доставят по поръчка.",
  },
  {
    question: "Колко време отнема вносът от Корея?",
    answer:
      "Ориентировъчно 8–10 седмици по море (в момента маршрутът минава покрай нос Добра надежда, което удължава превоза) плюс време за митническо оформяне, одобряване и регистрация — реалистично 2–3 месеца от покупката до готовност за КАТ. Ще ви държим в течение на всяка стъпка; точният срок зависи от конкретния случай.",
  },
  {
    question: "Какво се случва след пристигането на автомобила?",
    answer:
      "След митническото оформяне (мито и ДДС) автомобилът минава индивидуално одобряване (технотест) — задължително за коли без европейско одобрение на типа, заплаща се еднократната екотакса към ПУДООС според възрастта и задвижването, прави се ГТП и се регистрира в КАТ. SelectAuto съдейства за всички стъпки до предаването на ключа.",
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

/** Cities paragraph targets the real long-tail: „внос на коли от корея {град}"
 *  autocompletes for exactly these cities (docs/12-web-seo-strategy.md §3.11) —
 *  served as hub content, NOT standalone city pages (no demand, doorway risk). */
const CITIES = "София, Пловдив, Варна, Бургас, Стара Загора, Русе";

export default function KoreaHubPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Внос на коли от Корея", url: PATH },
  ]);
  const serviceJsonLd = buildServiceJsonLd({
    name: "Внос на коли от Корея",
    description:
      "Внос на автомобили от Корея (Encar) — подбор, проверка на история, транспорт, мито и ДДС, съдействие до регистрация в КАТ.",
    url: PATH,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

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
          <p className="mb-4 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Корея е един от най-изгодните пазари за внос на автомобили — коли с ниски километри, добро оборудване и
            прозрачна история през Encar, често на газ (LPI). SelectAuto поема целия процес: подбор, проверка на
            история, наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ.
          </p>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Корейският пазар на употребявани автомобили е сред най-бързо растящите източници на внос в света — огромен
            вътрешен оборот на почти нови коли, строга сервизна култура и официално документирана история на всеки
            автомобил. За българския купувач това означава нещо просто: за парите, които у нас купуват 12-годишен
            европейски автомобил, от Корея често пристига значително по-нов, по-добре оборудван и с проверима
            история.
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

          {/* The duty differentiator — the origin-declaration story (EU–KR FTA) */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Митото от Корея: 0% или 10%?</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="mb-3 text-[15px]/relaxed text-[#3d4046]">
                Това е детайлът, който прави най-голямата разлика в крайната цена — и който рядко се обяснява.
                По Споразумението за свободна търговия между ЕС и Южна Корея автомобил с корейски произход може да
                влезе в България с <strong>0% мито</strong>. Условието: корейският износител да е{" "}
                <strong>„одобрен износител“</strong> и да издаде декларация за преференциален произход върху фактурата
                — за пратки над 6 000 € това е единственият признат начин.
              </p>
              <p className="mb-3 text-[15px]/relaxed text-[#3d4046]">
                Кола, купена на корейски аукцион <em>без</em> такава декларация, дължи пълното мито от 10% върху
                стойността до България — а върху митото се начислява и ДДС. При автомобил за 15 000 € разликата е над
                2 000 € в крайната цена. Затова има значение през кого минава вносът: работим с износители, които
                могат да издадат документа, и посочваме честно кога това е възможно за конкретния автомобил.
              </p>
              <p className="text-[15px]/relaxed text-[#3d4046]">
                Калкулаторът по-долу има превключвател точно за това — вижте разликата в двата сценария за вашия
                бюджет, преди да говорим за конкретна кола.
              </p>
            </div>
          </section>

          {/* Calculator, preset to Korea */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Колко струва внос от Корея</h2>
            <p className="mb-5 max-w-2xl text-sm/relaxed text-[#3d4046]">
              Изчисли ориентировъчна разбивка на разходите за внос от Корея — мито (0% или 10%), ДДС, екотакса,
              одобряване и регистрация. Ставките са проверени към {RATES_VERIFIED_AT}. За обвързваща оферта за
              конкретен автомобил направи запитване.
            </p>
            <CostEstimator defaultMarket="kr" />
          </section>

          {/* History verification — the mileage-authenticity objection */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Как проверяваме историята — Encar доклад</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="mb-3 text-[15px]/relaxed text-[#3d4046]">
                Най-честият въпрос за колите от Корея е „реални ли са километрите?“. Отговорът е проверим: в Корея
                пробегът и състоянието се документират официално. За всеки автомобил, който подбираме, преглеждаме
                Encar доклада — застрахователната история (щети, изплатени събития, тотални щети, наводнения), броя
                собственици и смените на регистрация, и протокола от официалния оглед на състоянието, панел по панел.
              </p>
              <p className="mb-3 text-[15px]/relaxed text-[#3d4046]">
                Тези данни показваме директно в обявите си от Корея — история, застрахователни събития, оглед и
                фабрично оборудване са на страницата на всеки автомобил, преди да сте попитали. Ако историята на една
                кола не ни харесва, тя просто не стига до вас.
              </p>
              <p className="text-[15px]/relaxed text-[#3d4046]">
                Имате конкретен автомобил наум? Използвайте{" "}
                <Link href="/proverka-vin" className="font-semibold text-brand-dark hover:underline">
                  безплатната VIN проверка
                </Link>{" "}
                или ни изпратете обявата — ще извадим историята преди каквото и да е наддаване.
              </p>
            </div>
          </section>

          {/* LPI / газ */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Коли на газ (LPI) от Корея</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="mb-3 text-[15px]/relaxed text-[#3d4046]">
                Корея е единственият голям пазар, където газовите автомобили са <strong>фабрични</strong>. Системата
                LPI (Liquid Propane Injection) на Hyundai и Kia се произвежда заедно с двигателя — с фабрична гаранция
                за съвместимост, а не като допълнително монтирана уредба. Милиони Sonata, Grandeur и K5 се движат на
                газ от новите си дни, включително огромният таксиметров и фирмен парк, който после излиза на пазара
                обслужен и с документирана история.
              </p>
              <p className="text-[15px]/relaxed text-[#3d4046]">
                За България — пазар, където газта е традиционно решение — това е рядка комбинация: фабрична газова
                система, ниски разходи на километър и кола, проектирана за това гориво. Проверяваме системата и
                документите ѝ да отговарят на изискванията за регистрация у нас.
              </p>
            </div>
          </section>

          {/* Parts & service */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Части и сервиз в България</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="text-[15px]/relaxed text-[#3d4046]">
                Hyundai и Kia отдавна не са екзотика у нас — модели като Tucson и Sportage са в топ 10 на новите
                регистрации в България, а употребяваните им регистрации растат с над 40% годишно. Това означава
                изградена сервизна база, широко достъпни части и механици, които познават моделите. Корейските версии
                споделят голяма част от механиката с европейските; специфичните за корейския пазар части (например по
                LPI системата) се доставят по поръчка — съдействаме и след предаването на автомобила.
              </p>
            </div>
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
            <p className="mt-4 text-sm text-muted">
              Пълното описание на процеса — стъпка по стъпка, с 3D визуализация — е на страницата{" "}
              <Link href="/proces" className="font-semibold text-brand-dark hover:underline">
                Процес
              </Link>
              .
            </p>
          </section>

          {/* Honest transit + after arrival */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Срокове, транспорт и стъпките след пристигане</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
                <h3 className="mb-2 text-lg font-extrabold text-ink">Колко време отнема — честно</h3>
                <p className="mb-2 text-sm/relaxed text-[#5a5d64]">
                  Морският превоз от Корея в момента отнема ориентировъчно <strong>8–10 седмици</strong> — маршрутът
                  минава покрай нос Добра надежда, което го удължава. Ако някъде ви обещават „30–45 дни“, питайте как.
                </p>
                <p className="text-sm/relaxed text-[#5a5d64]">
                  Реалистично: 2–3 месеца от покупката до кола, готова за КАТ — контейнер до европейско пристанище,
                  сухопътен превоз до България, оформяне. Държим ви в течение на всяка стъпка, с проследяване на
                  пратката.
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
                <h3 className="mb-2 text-lg font-extrabold text-ink">След пристигането</h3>
                <p className="mb-2 text-sm/relaxed text-[#5a5d64]">
                  Митническо оформяне (мито и ДДС), <strong>индивидуално одобряване</strong> (технотест) — задължително
                  за автомобили без европейско одобрение на типа, еднократна <strong>екотакса</strong> към ПУДООС
                  според възрастта и задвижването, ГТП и регистрация в КАТ.
                </p>
                <p className="text-sm/relaxed text-[#5a5d64]">
                  Всички тези стъпки са включени в разбивката на калкулатора и в персоналната оферта — без изненади
                  в последния момент.
                </p>
              </div>
            </div>
          </section>

          {/* Featured Korea listings (streamed) */}
          <section className="mb-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-black text-ink">Актуални коли от Корея</h2>
              <Link
                href="/vsichki-avtomobili?market=kr"
                className="whitespace-nowrap text-sm font-bold text-brand-dark hover:underline"
              >
                Виж всички →
              </Link>
            </div>
            <Suspense fallback={<FeaturedSkeleton />}>
              <FeaturedKoreaCars />
            </Suspense>
          </section>

          {/* Testimonials (streamed, fail-open — renders nothing until the
              Places key is configured; full reviews live on /otzivi) */}
          <Suspense fallback={null}>
            <HubTestimonials />
          </Suspense>

          {/* Nationwide delivery — the country+city long-tail lives HERE, not on
              standalone city pages (docs/12-web-seo-strategy.md §4.2). */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Внос на коли от Корея до всяка точка на България</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="text-[15px]/relaxed text-[#3d4046]">
                Организираме доставка на внесения автомобил до {CITIES} и всеки друг град в страната. Огледът и
                предаването стават при нас в Пловдив или уговаряме транспорт до вашия адрес — процесът по внос,
                оформяне и регистрация е един и същ, независимо къде се намирате.
              </p>
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

          {/* Compare with the other sourcing markets (cross-hub links) */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Сравни с другите пазари</h2>
            <div className="flex flex-wrap gap-3">
              <LinkButton
                href="/vnos-na-koli-ot-sasht"
                rippleTheme="dark"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink transition-colors hover:text-brand-dark"
              >
                Внос на коли от САЩ
              </LinkButton>
              <LinkButton
                href="/vnos-na-koli-ot-kanada"
                rippleTheme="dark"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink transition-colors hover:text-brand-dark"
              >
                Внос на коли от Канада
              </LinkButton>
              <LinkButton
                href="/kalkulator"
                rippleTheme="dark"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink transition-colors hover:text-brand-dark"
              >
                Калкулатор за внос
              </LinkButton>
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
