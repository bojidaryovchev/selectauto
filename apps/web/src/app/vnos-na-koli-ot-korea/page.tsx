import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  type HubIcon,
  HubTestimonials,
  ImportArticle,
  ImportBar,
  ImportCalculator,
  ImportCards,
  ImportEnd,
  ImportFaq,
  ImportFeaturedCars,
  ImportHero,
  ImportProcess,
} from "@/components/hubs";
import {
  BadgeCheckIcon,
  CalculatorIcon,
  ClockIcon,
  FileCheckIcon,
  FileSearchIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  FuelIcon,
  GaugeIcon,
  LandmarkIcon,
  MapPinIcon,
  WrenchIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { RATES_VERIFIED_AT } from "@/data/import-rates";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildServiceJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

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
 * Look: boards `im-hub-kr`, `im-hub-states`, `im-hub-flow`; the sections are
 * components/hubs/import-sections.tsx; parity check docs/design/parity/vnos-na-koli.md.
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
    "Внос на автомобили от Корея със SelectAuto — Encar подбор, проверка на история, транспорт, мито и ДДС, регистрация в КАТ. Реални километри, газ/LPI, оборудване.",
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
      "Ориентировъчно 8–10 седмици до пристигането в България плюс време за митническо оформяне, одобряване и регистрация — реалистично 2–3 месеца от покупката до готовност за КАТ. Ще ви държим в течение на всяка стъпка; точният срок зависи от конкретния случай.",
  },
  {
    question: "Какво се случва след пристигането на автомобила?",
    answer:
      "След митническото оформяне (мито и ДДС) автомобилът минава индивидуално одобряване (технотест) — задължително за коли без европейско одобрение на типа, заплаща се еднократната екотакса към ПУДООС според възрастта и задвижването, прави се ГТП и се регистрира в КАТ. SelectAuto съдейства за всички стъпки до предаването на ключа.",
  },
];

/** Why-Korea pillars (real, indexable content), with the board's icons. */
const REASONS: { Icon: HubIcon; t: string; d: string }[] = [
  {
    Icon: GaugeIcon,
    t: "Ниски километри и добро състояние",
    d: "Голяма част от корейските автомобили са с редовна експлоатация и грижа — не от щети или наводнения.",
  },
  {
    Icon: FuelIcon,
    t: "Газ / LPI — икономична експлоатация",
    d: "Фабрични газови системи (LPI) са често срещани и намаляват разходите за гориво.",
  },
  {
    Icon: FileSearchIcon,
    t: "Прозрачна история през Encar",
    d: "Проверка на диагностика, снимки и история преди наддаване — по-малко изненади при внос от разстояние.",
  },
  {
    Icon: BadgeCheckIcon,
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

const CALC_ID = "kolko-struva-kr";
const ACTIONS_ID = "kr-hero-actions";
const CTA_ID = "kr-cta";

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
      <main className="flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

        <ImportHero
          crumb="Внос на коли от Корея"
          title="Внос на коли от Корея"
          Flag={FlagKrIcon}
          lead="Корея е един от най-изгодните пазари за внос на автомобили — коли с ниски километри, добро оборудване и прозрачна история през Encar, често на газ (LPI). SelectAuto поема целия процес: подбор, проверка на история, наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ."
          text="Корейският пазар на употребявани автомобили е сред най-бързо растящите източници на внос в света — огромен вътрешен оборот на почти нови коли, строга сервизна култура и официално документирана история на всеки автомобил. За българския купувач това означава нещо просто: за парите, които у нас купуват 12-годишен европейски автомобил, от Корея често пристига значително по-нов, по-добре оборудван и с проверима история."
          calcId={CALC_ID}
          actionsId={ACTIONS_ID}
          whyId="kr-why"
          whyTitle="Защо коли от Корея"
          reasons={REASONS}
        />

        {/* The duty differentiator — the origin-declaration story (EU–KR FTA) */}
        <ImportArticle Icon={LandmarkIcon} title="Митото от Корея: 0% или 10%?">
          <p>
            Това е детайлът, който прави най-голямата разлика в крайната цена — и който рядко се обяснява. По
            Споразумението за свободна търговия между ЕС и Южна Корея автомобил с корейски произход може да влезе в
            България с <strong>0% мито</strong>. Условието: корейският износител да е{" "}
            <strong>„одобрен износител“</strong> и да издаде декларация за преференциален произход върху фактурата — за
            пратки над 6 000 € това е единственият признат начин.
          </p>
          <p>
            Кола, купена на корейски аукцион <em>без</em> такава декларация, дължи пълното мито от 10% върху стойността
            до България — а върху митото се начислява и ДДС. При автомобил за 15 000 € разликата е над 2 000 € в
            крайната цена. Затова има значение през кого минава вносът: работим с износители, които могат да издадат
            документа, и посочваме честно кога това е възможно за конкретния автомобил.
          </p>
          <p>
            Калкулаторът по-долу има превключвател точно за това — вижте разликата в двата сценария за вашия бюджет,
            преди да говорим за конкретна кола.
          </p>
        </ImportArticle>

        {/* Calculator, preset to Korea */}
        <ImportCalculator
          id={CALC_ID}
          title="Колко струва внос от Корея"
          market="kr"
          intro={
            <>
              Изчислете ориентировъчна разбивка на разходите за внос от Корея — комисионна, транспорт, мито (0% или
              10%), ДДС и по желание технотест. Всички суми са в долари ($). Ставките са проверени към{" "}
              {RATES_VERIFIED_AT}. За обвързваща оферта за конкретен автомобил направете запитване.
            </>
          }
        />

        {/* History verification — the mileage-authenticity objection */}
        <ImportArticle Icon={FileSearchIcon} title="Как проверяваме историята — Encar доклад">
          <p>
            Най-честият въпрос за колите от Корея е „реални ли са километрите?“. Отговорът е проверим: в Корея
            пробегът и състоянието се документират официално. За всеки автомобил, който подбираме, преглеждаме Encar
            доклада — застрахователната история (щети, изплатени събития, тотални щети, наводнения), броя собственици и
            смените на регистрация, и протокола от официалния оглед на състоянието, панел по панел.
          </p>
          <p>
            Тези данни показваме директно в обявите си от Корея — история, застрахователни събития, оглед и фабрично
            оборудване са на страницата на всеки автомобил, преди да сте попитали. Ако историята на една кола не ни
            харесва, тя просто не стига до вас.
          </p>
          <p>
            Имате конкретен автомобил наум? Използвайте <Link href="/proverka-vin">безплатната VIN проверка</Link> или
            ни изпратете обявата — ще извадим историята преди каквото и да е наддаване.
          </p>
        </ImportArticle>

        {/* LPI / газ, and parts & service */}
        <ImportCards
          headingLevel={2}
          items={[
            {
              Icon: FuelIcon,
              t: "Коли на газ (LPI) от Корея",
              body: (
                <>
                  <p>
                    Корея е единственият голям пазар, където газовите автомобили са <strong>фабрични</strong>.
                    Системата LPI (Liquid Propane Injection) на Hyundai и Kia се произвежда заедно с двигателя — с
                    фабрична гаранция за съвместимост, а не като допълнително монтирана уредба. Милиони Sonata,
                    Grandeur и K5 се движат на газ от новите си дни, включително огромният таксиметров и фирмен парк,
                    който после излиза на пазара обслужен и с документирана история.
                  </p>
                  <p>
                    За България — пазар, където газта е традиционно решение — това е рядка комбинация: фабрична газова
                    система, ниски разходи на километър и кола, проектирана за това гориво. Проверяваме системата и
                    документите ѝ да отговарят на изискванията за регистрация у нас.
                  </p>
                </>
              ),
            },
            {
              Icon: WrenchIcon,
              t: "Части и сервиз в България",
              body: (
                <p>
                  Hyundai и Kia отдавна не са екзотика у нас — модели като Tucson и Sportage са в топ 10 на новите
                  регистрации в България, а употребяваните им регистрации растат с над 40% годишно. Това означава
                  изградена сервизна база, широко достъпни части и механици, които познават моделите. Корейските
                  версии споделят голяма част от механиката с европейските; специфичните за корейския пазар части
                  (например по LPI системата) се доставят по поръчка — съдействаме и след предаването на автомобила.
                </p>
              ),
            },
          ]}
        />

        <ImportProcess
          steps={STEPS}
          note={
            <>
              Пълното описание на процеса — стъпка по стъпка, с 3D визуализация — е на страницата{" "}
              <Link href="/proces">Процес</Link>.
            </>
          }
        />

        {/* Honest transit + after arrival */}
        <ImportCards
          title="Срокове, транспорт и стъпките след пристигане"
          items={[
            {
              Icon: ClockIcon,
              t: "Колко време отнема — честно",
              body: (
                <>
                  <p>
                    Морският превоз от Корея до Европа отнема ориентировъчно <strong>5–7 седмици</strong>, а до
                    пристигането в България — <strong>8–10 седмици</strong>. Ако някъде ви обещават кола от Корея за
                    „30–45 дни“, питайте как.
                  </p>
                  <p>
                    Реалистично: 2–3 месеца от покупката до кола, готова за КАТ — контейнер до европейско пристанище,
                    сухопътен превоз до България, оформяне. Държим ви в течение на всяка стъпка, с проследяване на
                    пратката.
                  </p>
                </>
              ),
            },
            {
              Icon: FileCheckIcon,
              t: "След пристигането",
              body: (
                <>
                  <p>
                    Митническо оформяне (мито и ДДС), <strong>индивидуално одобряване</strong> (технотест) —
                    задължително за автомобили без европейско одобрение на типа, еднократна <strong>екотакса</strong>{" "}
                    към ПУДООС според възрастта и задвижването, ГТП и регистрация в КАТ.
                  </p>
                  <p>
                    Всички тези стъпки са включени в разбивката на калкулатора и в персоналната оферта — без изненади
                    в последния момент.
                  </p>
                </>
              ),
            },
          ]}
        />

        {/* Featured Korea listings (streamed) */}
        <ImportFeaturedCars
          market="kr"
          title="Актуални коли от Корея"
          allHref="/vsichki-avtomobili?market=kr"
          emptyText="В момента няма активни обяви за коли от Корея. Заявете персонална селекция и ще намерим подходящ автомобил."
        />

        {/* Testimonials (streamed, fail-open — renders nothing until the
            Places key is configured; full reviews live on /otzivi) */}
        <Suspense fallback={null}>
          <HubTestimonials />
        </Suspense>

        {/* Nationwide delivery — the country+city long-tail lives HERE, not on
            standalone city pages (docs/12-web-seo-strategy.md §4.2). */}
        <ImportArticle Icon={MapPinIcon} title="Внос на коли от Корея до всяка точка на България">
          <p>
            Организираме доставка на внесения автомобил до {CITIES} и всеки друг град в страната. Огледът и
            предаването стават при нас в Пловдив или уговаряме транспорт до вашия адрес — процесът по внос, оформяне и
            регистрация е един и същ, независимо къде се намирате.
          </p>
        </ImportArticle>

        {/* FAQ (the kit accordion; every answer stays in the page — matches the FAQPage JSON-LD) */}
        <ImportFaq items={FAQ} />

        {/* Compare with the other sourcing markets (cross-hub links), and the CTA */}
        <ImportEnd
          links={[
            { href: "/vnos-na-koli-ot-sasht", label: "Внос на коли от САЩ", Icon: FlagUsIcon, flag: true },
            { href: "/vnos-na-koli-ot-kanada", label: "Внос на коли от Канада", Icon: FlagCaIcon, flag: true },
            { href: "/kalkulator", label: "Калкулатор за внос", Icon: CalculatorIcon },
          ]}
          ctaId={CTA_ID}
          ctaTitle="Искате кола от Корея?"
          ctaText="Кажете ни марка, модел и бюджет — ще подберем подходящи автомобили от Encar и ще изготвим персонална калкулация, без скрити такси."
        />

        <ImportBar calcId={CALC_ID} actionsId={ACTIONS_ID} ctaId={CTA_ID} />
      </main>
      <SiteFooter />
      {/* Room for the phone bar at the page's end (phones only, with the bar). */}
      <div className="sa-only-ph h-17.25" aria-hidden="true" />
    </>
  );
}
