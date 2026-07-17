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
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildServiceJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";
import { getCarsPage } from "@/queries/cars";

/**
 * /vnos-na-koli-ot-sasht — the USA country hub (docs/12-web-seo-strategy.md §4.2). Targets
 * „внос на коли от Америка/САЩ" (a saturated but high-volume head term) + the
 * cost/trust clusters, and links into the US inventory (market=us) + calculator.
 *
 * Copy is FACT-CHECKED (2026): BG non-EU import = 10% duty + 20% VAT (duty on
 * value+transport, VAT on value+transport+duty — matches CostEstimator); sources
 * are Copart/IAAI; clean-title cars are easiest to import while salvage = an
 * insurance total-loss (we state this honestly rather than hiding it). Shipping is
 * RoRo (cheaper) or container (more protection). See the Korea hub for the shared
 * structure/pattern.
 */

const PATH = "/vnos-na-koli-ot-sasht";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Внос на коли от САЩ (Америка) — Copart, IAAI | SelectAuto",
  description:
    "Внос на автомобили от САЩ с SelectAuto — избор от Copart и IAAI, Carfax проверка, транспорт, мито и ДДС, регистрация в КАТ. Ясна разбивка на разходите.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "Внос на коли от САЩ | SelectAuto",
    description: "Copart и IAAI подбор, Carfax проверка, пълно съдействие до регистрация в КАТ.",
    path: PATH,
  }),
};

/** Visible FAQ — also emitted as FAQPage JSON-LD (must match rendered text). */
const FAQ: FaqEntry[] = [
  {
    question: "Защо да внеса кола от САЩ?",
    answer:
      "Американският пазар предлага огромен избор и обем от автомобили през аукционите Copart и IAAI, често на конкурентни цени спрямо европейския пазар. С правилен подбор и проверка може да се намери добър автомобил на изгодна цена.",
  },
  {
    question: "Каква е разликата между clean title и salvage title?",
    answer:
      "Clean title означава автомобил без сериозна застрахователна щета — най-лесен за внос и регистрация. Salvage title означава, че автомобилът е обявен за тотална щета от застраховател; такива коли са по-евтини, но изискват внимателна проверка и ремонт. Проверяваме статуса и историята (Carfax/VIN) преди наддаване.",
  },
  {
    question: "Колко струва внос на кола от Америка?",
    answer:
      "При внос от страна извън ЕС се дължат мито 10% и ДДС 20%: митото се начислява върху стойността на автомобила плюс транспорта, а ДДС — върху стойността, транспорта и митото. Към това се добавят аукционни такси и регистрация. Използвайте калкулатора по-горе за ориентир; за обвързваща оферта направете запитване.",
  },
  {
    question: "Какво е Copart и IAAI?",
    answer:
      "Copart и IAAI са двете най-големи американски онлайн аукционни платформи за автомобили, включително коли с и без застрахователна щета. Чрез регистриран достъп или брокер се наддава за конкретен лот; ние поемаме подбора, наддаването и логистиката.",
  },
  {
    question: "Как се транспортира автомобилът от САЩ?",
    answer:
      "Обичайно с контейнерен превоз (по-голяма защита) или RoRo (по-икономичен вариант), последван от сухопътна логистика до България. Срокът и цената зависят от пристанището на натоварване и текущите навла.",
  },
  {
    question: "Как да не купя наводнена кола от Америка?",
    answer:
      "Наводнените автомобили (flood title) са най-рискованата категория — щетите по електрониката се проявяват късно. Защитата е в историята: flood статусът се вижда в title документа, в Carfax записите и в снимките от аукциона. Проверяваме title статуса и историята на всеки автомобил преди наддаване и не предлагаме коли с прикрита flood история.",
  },
  {
    question: "Колко време отнема вносът от САЩ?",
    answer:
      "Ориентировъчно 4–7 седмици от пристанището в САЩ до Европа (трансатлантическият маршрут не е засегнат от отклоненията около Африка), плюс сухопътен превоз до България и оформяне. Реалистично: около 2 месеца от покупката до кола, готова за регистрация в КАТ.",
  },
  {
    question: "Какво е нужно, за да се регистрира американска кола в България?",
    answer:
      "Американските автомобили нямат европейско одобрение на типа, затова минават индивидуално одобряване (технотест). Обичайните адаптации са: фарове с европейски (ECE) светлинен сноп, заден фар за мъгла и скоростомер, показващ km/h. След това се заплаща екотаксата, прави се ГТП и колата се регистрира в КАТ — съдействаме за всички стъпки.",
  },
];

/** Title-type mini glossary (visible cards) — the honest objection-handling
 *  content the trust cluster demands (clean/salvage/rebuilt/flood). */
const TITLE_TYPES: { t: string; d: string }[] = [
  {
    t: "Clean title",
    d: "Без сериозна застрахователна щета — най-лесен за внос и регистрация, на по-висока цена.",
  },
  {
    t: "Salvage title",
    d: "Обявен за тотална щета от застраховател. По-евтин, но изисква оглед на щетите, реалистична сметка за ремонт и внимателна проверка.",
  },
  {
    t: "Rebuilt title",
    d: "Salvage кола след ремонт и повторна инспекция. Цената е между clean и salvage — историята на ремонта е ключова.",
  },
  {
    t: "Flood / вода",
    d: "Наводнен автомобил. Най-рисковата категория — щетите по електрониката се проявяват със закъснение. Избягваме ги и ги разпознаваме по историята.",
  },
];

/** Why-USA pillars (fact-checked). */
const REASONS: { t: string; d: string }[] = [
  {
    t: "Огромен избор и обем",
    d: "Copart и IAAI предлагат стотици хиляди автомобили — от икономични до луксозни и пикапи.",
  },
  {
    t: "Конкурентни цени",
    d: "С правилен подбор американските коли често излизат по-изгодно спрямо европейския пазар.",
  },
  {
    t: "Прозрачна история (Carfax/VIN)",
    d: "Проверяваме title статуса, щетите и историята преди наддаване — по-малко изненади.",
  },
  {
    t: "Пикапи и специфични модели",
    d: "Американският пазар е силен за пикапи, мускул коли и версии, рядко срещани в Европа.",
  },
];

/** Five process steps (shared narrative with /proces). */
const STEPS: { n: string; t: string; d: string }[] = [
  { n: "1", t: "Подбор", d: "Избираме подходящи автомобили от Copart/IAAI според бюджета и изискванията." },
  { n: "2", t: "Проверка", d: "Проверяваме title статус, щети и история (Carfax/VIN) преди решение." },
  { n: "3", t: "Наддаване / покупка", d: "Наддаваме за лота или използваме Buy Now оферта." },
  { n: "4", t: "Транспорт и оформяне", d: "Организираме превоза до България, митото, ДДС и документите." },
  { n: "5", t: "Предаване", d: "Автомобилът е готов за регистрация в КАТ и предаване на ключа." },
];

export default function UsaHubPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Внос на коли от САЩ", url: PATH },
  ]);
  const serviceJsonLd = buildServiceJsonLd({
    name: "Внос на коли от САЩ",
    description:
      "Внос на автомобили от САЩ (Copart, IAAI) — подбор, наддаване, Carfax проверка, транспорт, мито и ДДС, съдействие до регистрация в КАТ.",
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
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">Внос на коли от САЩ</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Внос на коли от САЩ
          </h1>
          <p className="mb-4 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            САЩ е най-големият пазар за внос на автомобили — огромен избор през Copart и IAAI, конкурентни цени и силно
            предлагане на пикапи и специфични модели. SelectAuto поема целия процес: подбор, проверка на history/title,
            наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ.
          </p>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Ще бъдем честни: вносът от Америка има и лоша слава — в Европа периодично гърмят скандали с тотално
            бракувани коли, продадени след козметичен ремонт. Именно затова нашият процес започва от историята, а не
            от цената: title статус, Carfax записи и снимки от аукциона се проверяват преди каквото и да е наддаване, и
            получавате всичко това черно на бяло. Изгодната сделка от САЩ съществува — но само с проверена история.
          </p>

          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Защо коли от САЩ</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {REASONS.map((r) => (
                <div key={r.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink">{r.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{r.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Title types — the honest objection-handling glossary (trust cluster) */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Видове title — какво всъщност купуваш</h2>
            <p className="mb-5 max-w-2xl text-sm/relaxed text-[#3d4046]">
              Всеки американски автомобил идва с title документ, който казва истината за миналото му. Разликата между
              изгодна сделка и скъп урок е в това какъв title купуваш — и дали историята зад него е проверена.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TITLE_TYPES.map((r) => (
                <div key={r.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink">{r.t}</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">{r.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              Преди наддаване проверяваме title статуса и историята на всеки лот —{" "}
              <Link href="/proverka-vin" className="font-semibold text-brand-dark hover:underline">
                безплатна VIN проверка
              </Link>{" "}
              или пълен{" "}
              <Link href="/carfax" className="font-semibold text-brand-dark hover:underline">
                Carfax доклад
              </Link>
              .
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Колко струва внос от САЩ</h2>
            <p className="mb-5 max-w-2xl text-sm/relaxed text-[#3d4046]">
              Изчисли ориентировъчна разбивка: цена, аукционни такси, транспорт, мито (10%) и ДДС (20%), екотакса,
              одобряване и регистрация. За обвързваща оферта за конкретен автомобил направи запитване.
            </p>
            <CostEstimator defaultMarket="us" />
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
              <h2 className="text-2xl font-black text-ink">Актуални коли от САЩ</h2>
              <Link
                href="/vsichki-avtomobili?market=us"
                className="whitespace-nowrap text-sm font-bold text-brand-dark hover:underline"
              >
                Виж всички →
              </Link>
            </div>
            <Suspense fallback={<FeaturedSkeleton />}>
              <FeaturedUsaCars />
            </Suspense>
          </section>

          {/* Honest transit + post-arrival (US-specific: individual approval +
              ECE-light/speedometer adaptation) */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Срокове, транспорт и стъпките след пристигане</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
                <h3 className="mb-2 text-lg font-extrabold text-ink">Колко време отнема — честно</h3>
                <p className="mb-2 text-sm/relaxed text-[#5a5d64]">
                  Трансатлантическият превоз отнема ориентировъчно <strong>4–7 седмици</strong> от пристанище в САЩ до
                  Европа — този маршрут не е засегнат от отклоненията около Африка, така че САЩ в момента е
                  по-бързият презокеански вариант спрямо Азия.
                </p>
                <p className="text-sm/relaxed text-[#5a5d64]">
                  Реалистично: около 2 месеца от покупката до кола, готова за КАТ — включително сухопътния превоз до
                  България и оформянето. Държим ви в течение на всяка стъпка.
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
                <h3 className="mb-2 text-lg font-extrabold text-ink">След пристигането</h3>
                <p className="mb-2 text-sm/relaxed text-[#5a5d64]">
                  Американските автомобили нямат европейско одобрение на типа, затова минават{" "}
                  <strong>индивидуално одобряване</strong> (технотест) с типичните адаптации: фарове с европейски (ECE)
                  светлинен сноп, заден фар за мъгла и km/h скоростомер.
                </p>
                <p className="text-sm/relaxed text-[#5a5d64]">
                  Следват еднократната <strong>екотакса</strong> към ПУДООС, ГТП и регистрация в КАТ — всичко е
                  включено в разбивката на калкулатора и в персоналната оферта.
                </p>
              </div>
            </div>
          </section>

          {/* Testimonials (streamed, fail-open — same daily-cached read as /otzivi) */}
          <Suspense fallback={null}>
            <HubTestimonials />
          </Suspense>

          {/* Nationwide delivery — the country+city long-tail lives HERE, not on
              standalone city pages (docs/12-web-seo-strategy.md §4.2). */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Внос на коли от САЩ до всяка точка на България</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
              <p className="text-[15px]/relaxed text-[#3d4046]">
                Организираме доставка на внесения автомобил до София, Пловдив, Варна, Бургас, Стара Загора, Русе и
                всеки друг град в страната. Огледът и предаването стават при нас в Пловдив или уговаряме транспорт до
                вашия адрес — процесът по внос, оформяне и регистрация е един и същ, независимо къде се намирате.
              </p>
            </div>
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

          {/* Compare with the other sourcing markets (cross-hub links) */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Сравни с другите пазари</h2>
            <div className="flex flex-wrap gap-3">
              <LinkButton
                href="/vnos-na-koli-ot-korea"
                rippleTheme="dark"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink transition-colors hover:text-brand-dark"
              >
                Внос на коли от Корея
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

          <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш кола от САЩ?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Кажи ни марка, модел и бюджет — ще подберем подходящи автомобили от Copart/IAAI и ще изготвим персонална
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

/** Server island: first few active US listings (market=us). */
async function FeaturedUsaCars() {
  // See the Korea hub: opt this streamed island into request-time rendering so the
  // Drizzle `randomBytes` call doesn't trip the prerender-random guard and fail the
  // build. The shell stays static; the listings stream behind the skeleton.
  await connection();
  const page = await getCarsPage({ market: "us" }, null);
  const cars = page.cars.slice(0, 6);
  if (cars.length === 0) {
    return (
      <p className="text-sm text-muted">
        В момента няма активни обяви за коли от САЩ. Заяви персонална селекция и ще намерим подходящ автомобил.
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
