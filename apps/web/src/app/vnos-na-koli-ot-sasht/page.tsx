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
  CalculatorIcon,
  CircleDollarSignIcon,
  ClockIcon,
  FileCheckIcon,
  FileSearchIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  LayoutGridIcon,
  MapPinIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  TruckIcon,
  WrenchIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildServiceJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

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
 *
 * Look: boards `im-hub-us`, `im-hub-states`; the sections are components/hubs/import-sections.tsx; parity check
 * docs/design/parity/vnos-na-koli.md.
 */

const PATH = "/vnos-na-koli-ot-sasht";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Внос на коли от САЩ (Америка) — Copart, IAAI | SelectAuto",
  description:
    "Внос на автомобили от САЩ със SelectAuto — избор от Copart и IAAI, Carfax проверка, транспорт, мито и ДДС, регистрация в КАТ. Ясна разбивка на разходите.",
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
 *  content the trust cluster demands (clean/salvage/rebuilt/flood). The icons take the state colours. */
const TITLE_TYPES: { Icon: HubIcon; tone: "pos" | "warn" | "info" | "neg"; t: string; d: string }[] = [
  {
    Icon: ShieldCheckIcon,
    tone: "pos",
    t: "Clean title",
    d: "Без сериозна застрахователна щета — най-лесен за внос и регистрация, на по-висока цена.",
  },
  {
    Icon: WrenchIcon,
    tone: "warn",
    t: "Salvage title",
    d: "Обявен за тотална щета от застраховател. По-евтин, но изисква оглед на щетите, реалистична сметка за ремонт и внимателна проверка.",
  },
  {
    Icon: RefreshCwIcon,
    tone: "info",
    t: "Rebuilt title",
    d: "Salvage кола след ремонт и повторна инспекция. Цената е между clean и salvage — историята на ремонта е ключова.",
  },
  {
    Icon: TriangleAlertIcon,
    tone: "neg",
    t: "Flood / вода",
    d: "Наводнен автомобил. Най-рисковата категория — щетите по електрониката се проявяват със закъснение. Избягваме ги и ги разпознаваме по историята.",
  },
];

/** Why-USA pillars (fact-checked), with the board's icons. */
const REASONS: { Icon: HubIcon; t: string; d: string }[] = [
  {
    Icon: LayoutGridIcon,
    t: "Огромен избор и обем",
    d: "Copart и IAAI предлагат стотици хиляди автомобили — от икономични до луксозни и пикапи.",
  },
  {
    Icon: CircleDollarSignIcon,
    t: "Конкурентни цени",
    d: "С правилен подбор американските коли често излизат по-изгодно спрямо европейския пазар.",
  },
  {
    Icon: FileSearchIcon,
    t: "Прозрачна история (Carfax/VIN)",
    d: "Проверяваме title статуса, щетите и историята преди наддаване — по-малко изненади.",
  },
  {
    Icon: TruckIcon,
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

const CALC_ID = "kolko-struva-us";
const ACTIONS_ID = "us-hero-actions";
const CTA_ID = "us-cta";

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
      <main className="flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

        <ImportHero
          crumb="Внос на коли от САЩ"
          title="Внос на коли от САЩ"
          Flag={FlagUsIcon}
          lead="САЩ е най-големият пазар за внос на автомобили — огромен избор през Copart и IAAI, конкурентни цени и силно предлагане на пикапи и специфични модели. SelectAuto поема целия процес: подбор, проверка на history/title, наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ."
          text="Ще бъдем честни: вносът от Америка има и лоша слава — в Европа периодично гърмят скандали с тотално бракувани коли, продадени след козметичен ремонт. Именно затова нашият процес започва от историята, а не от цената: title статус, Carfax записи и снимки от аукциона се проверяват преди каквото и да е наддаване, и получавате всичко това черно на бяло. Изгодната сделка от САЩ съществува — но само с проверена история."
          calcId={CALC_ID}
          actionsId={ACTIONS_ID}
          whyId="us-why"
          whyTitle="Защо коли от САЩ"
          reasons={REASONS}
        />

        {/* Title types — the honest objection-handling glossary (trust cluster) */}
        <ImportCards
          title="Видове title — какво всъщност купувате"
          intro="Всеки американски автомобил идва с title документ, който казва истината за миналото му. Разликата между изгодна сделка и скъп урок е в това какъв title купувате — и дали историята зад него е проверена."
          columns={4}
          items={TITLE_TYPES.map(({ Icon, tone, t, d }) => ({ Icon, tone, t, body: <p>{d}</p> }))}
          note={
            <>
              Преди наддаване проверяваме title статуса и историята на всеки лот —{" "}
              <Link href="/proverka-vin">безплатна VIN проверка</Link> или пълен{" "}
              <Link href="/carfax">Carfax доклад</Link>.
            </>
          }
        />

        <ImportCalculator
          id={CALC_ID}
          title="Колко струва внос от САЩ"
          market="us"
          intro="Изчислете ориентировъчна разбивка: цена, аукционни такси, транспорт, мито (10%) и ДДС (20%), екотакса, одобряване и регистрация. За обвързваща оферта за конкретен автомобил направете запитване."
        />

        <ImportProcess steps={STEPS} />

        <ImportFeaturedCars
          market="us"
          title="Актуални коли от САЩ"
          allHref="/vsichki-avtomobili?market=us"
          emptyText="В момента няма активни обяви за коли от САЩ. Заявете персонална селекция и ще намерим подходящ автомобил."
        />

        {/* Honest transit + post-arrival (US-specific: individual approval +
            ECE-light/speedometer adaptation) */}
        <ImportCards
          title="Срокове, транспорт и стъпките след пристигане"
          items={[
            {
              Icon: ClockIcon,
              t: "Колко време отнема — честно",
              body: (
                <>
                  <p>
                    Трансатлантическият превоз отнема ориентировъчно <strong>4–7 седмици</strong> от пристанище в САЩ
                    до Европа — този маршрут не е засегнат от отклоненията около Африка, така че САЩ в момента е
                    по-бързият презокеански вариант спрямо Азия.
                  </p>
                  <p>
                    Реалистично: около 2 месеца от покупката до кола, готова за КАТ — включително сухопътния превоз до
                    България и оформянето. Държим ви в течение на всяка стъпка.
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
                    Американските автомобили нямат европейско одобрение на типа, затова минават{" "}
                    <strong>индивидуално одобряване</strong> (технотест) с типичните адаптации: фарове с европейски
                    (ECE) светлинен сноп, заден фар за мъгла и km/h скоростомер.
                  </p>
                  <p>
                    Следват еднократната <strong>екотакса</strong> към ПУДООС, ГТП и регистрация в КАТ — всичко е
                    включено в разбивката на калкулатора и в персоналната оферта.
                  </p>
                </>
              ),
            },
          ]}
        />

        {/* Testimonials (streamed, fail-open — same daily-cached read as /otzivi) */}
        <Suspense fallback={null}>
          <HubTestimonials />
        </Suspense>

        {/* Nationwide delivery — the country+city long-tail lives HERE, not on
            standalone city pages (docs/12-web-seo-strategy.md §4.2). */}
        <ImportArticle Icon={MapPinIcon} title="Внос на коли от САЩ до всяка точка на България">
          <p>
            Организираме доставка на внесения автомобил до София, Пловдив, Варна, Бургас, Стара Загора, Русе и всеки
            друг град в страната. Огледът и предаването стават при нас в Пловдив или уговаряме транспорт до вашия адрес
            — процесът по внос, оформяне и регистрация е един и същ, независимо къде се намирате.
          </p>
        </ImportArticle>

        <ImportFaq items={FAQ} />

        {/* Compare with the other sourcing markets (cross-hub links), and the CTA */}
        <ImportEnd
          links={[
            { href: "/vnos-na-koli-ot-korea", label: "Внос на коли от Корея", Icon: FlagKrIcon, flag: true },
            { href: "/vnos-na-koli-ot-kanada", label: "Внос на коли от Канада", Icon: FlagCaIcon, flag: true },
            { href: "/kalkulator", label: "Калкулатор за внос", Icon: CalculatorIcon },
          ]}
          ctaId={CTA_ID}
          ctaTitle="Искате кола от САЩ?"
          ctaText="Кажете ни марка, модел и бюджет — ще подберем подходящи автомобили от Copart/IAAI и ще изготвим персонална калкулация, без скрити такси."
        />

        <ImportBar calcId={CALC_ID} actionsId={ACTIONS_ID} ctaId={CTA_ID} />
      </main>
      <SiteFooter />
      {/* Room for the phone bar at the page's end (phones only, with the bar). */}
      <div className="sa-only-ph h-17.25" aria-hidden="true" />
    </>
  );
}
