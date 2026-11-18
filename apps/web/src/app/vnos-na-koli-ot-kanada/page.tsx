import type { Metadata } from "next";
import { Suspense } from "react";
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
  MapPinIcon,
  ScaleIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildServiceJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

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
 *
 * Look: boards `im-hub-ca`, `im-hub-states`; the sections are components/hubs/import-sections.tsx; parity check
 * docs/design/parity/vnos-na-koli.md.
 */

const PATH = "/vnos-na-koli-ot-kanada";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Внос на коли от Канада — Carfax, прозрачна история | SelectAuto",
  description:
    "Внос на автомобили от Канада със SelectAuto — пълна история през Carfax, проверка на състояние и корозия, транспорт, мито и ДДС, регистрация в КАТ.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "Внос на коли от Канада | SelectAuto",
    description: "Carfax история, проверка на състояние, пълно съдействие до регистрация в КАТ.",
    path: PATH,
  }),
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
      "Ориентировъчно 5–8 седмици по море от канадско пристанище до Европа (трансатлантическият маршрут не е засегнат от отклоненията около Африка), плюс сухопътен превоз до България и оформяне. Реалистично: около 2 месеца от покупката до кола, готова за регистрация в КАТ.",
  },
  {
    question: "Има ли 0% мито за коли от Канада заради споразумението CETA?",
    answer:
      "На практика — рядко. CETA премахва митото само за автомобили с канадски произход (произведени в Канада по правилата за произход), а голямата част от колите по канадските аукциони са произведени в САЩ или другаде — за тях се дължи стандартното мито от 10%. Затова калкулираме с 10% по подразбиране и посочваме изрично, ако конкретен автомобил отговаря на условията за преференция.",
  },
  {
    question: "Какво е Impact Auto Auctions / IAA Canada?",
    answer:
      "Impact Auto Auctions е най-голямата канадска аукционна мрежа за автомобили, вече изцяло интегрирана като IAA Canada — двете имена се отнасят за същите аукциони. Достъпът за международни купувачи е онлайн; ние поемаме подбора, наддаването и логистиката.",
  },
  {
    question: "Какво е нужно, за да се регистрира канадска кола в България?",
    answer:
      "Канадските автомобили следват северноамериканските стандарти и нямат европейско одобрение на типа, затова минават индивидуално одобряване (технотест) с типичните адаптации — фарове с европейски светлинен сноп, заден фар за мъгла, km/h скоростомер. След това: екотакса, ГТП и регистрация в КАТ — съдействаме за всички стъпки.",
  },
];

/** Why-Canada pillars (fact-checked, honest on rust), with the board's icons. */
const REASONS: { Icon: HubIcon; t: string; d: string }[] = [
  {
    Icon: FileSearchIcon,
    t: "Прозрачна история (Carfax)",
    d: "Всяка канадска провинция се покрива от Carfax — собственици, километри, инциденти, регистрации.",
  },
  {
    Icon: ShieldCheckIcon,
    t: "Добър избор с чиста история",
    d: "Много автомобили идват от редовна експлоатация с проследима история, а не от щети.",
  },
  {
    Icon: CircleDollarSignIcon,
    t: "Конкурентни цени",
    d: "С правилен подбор канадските коли често излизат изгодно спрямо европейския пазар.",
  },
  {
    Icon: SearchIcon,
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

const CALC_ID = "kolko-struva-ca";
const ACTIONS_ID = "ca-hero-actions";
const CTA_ID = "ca-cta";

export default function CanadaHubPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Внос на коли от Канада", url: PATH },
  ]);
  const serviceJsonLd = buildServiceJsonLd({
    name: "Внос на коли от Канада",
    description:
      "Внос на автомобили от Канада — пълна история през Carfax, проверка на състояние, транспорт, мито и ДДС, съдействие до регистрация в КАТ.",
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
          crumb="Внос на коли от Канада"
          title="Внос на коли от Канада"
          Flag={FlagCaIcon}
          lead="Канада е силен пазар за автомобили с прозрачна история — Carfax покрива всяка провинция, а изборът на коли с чиста история е добър. SelectAuto поема целия процес: подбор, проверка на Carfax и състояние (включително корозия), наддаване, транспорт, мито и ДДС, и съдействие до регистрация в КАТ."
          text="Канадските аукциони (IAA Canada, доскоро Impact Auto Auctions) работят на същия принцип като американските Copart и IAAI, но с по-малка конкуренция от международни купувачи на някои лотове — там се появяват добри сделки. Ще прочетете и твърдения за „0% мито по CETA“ — по-долу обясняваме честно защо това почти никога не важи за аукционни коли и как калкулираме реалната крайна цена."
          calcId={CALC_ID}
          actionsId={ACTIONS_ID}
          whyId="ca-why"
          whyTitle="Защо коли от Канада"
          reasons={REASONS}
        />

        <ImportCalculator
          id={CALC_ID}
          title="Колко струва внос от Канада"
          market="ca"
          intro="Изчислете ориентировъчна разбивка: цена, аукционни такси, транспорт, мито (10%) и ДДС (20%), регистрация. За обвързваща оферта за конкретен автомобил направете запитване."
        />

        {/* CETA myth-busting — the researched differentiator: competitors either
            stay silent or imply duty-free Canada; the origin rules say otherwise. */}
        <ImportArticle Icon={ScaleIcon} title="„0% мито по CETA“ — митът за Канада">
          <p>
            Търговското споразумение ЕС–Канада (CETA) наистина премахна митото за автомобили — но{" "}
            <strong>само за автомобили с канадски произход</strong> по правилата за произход, с декларация от
            износителя. Уловката: голямата част от колите по канадските аукциони са произведени в САЩ, Мексико или
            Азия. Фактът, че купувате колата <em>в</em> Канада, не я прави <em>канадска</em> по произход.
          </p>
          <p>
            Затова калкулираме с 10% мито по подразбиране — честната сметка, с която няма изненади на митницата. Ако
            конкретен автомобил реално отговаря на условията за преференция, ще ви го посочим изрично в персоналната
            оферта.
          </p>
        </ImportArticle>

        <ImportProcess steps={STEPS} />

        <ImportFeaturedCars
          market="ca"
          title="Актуални коли от Канада"
          allHref="/vsichki-avtomobili?market=ca"
          emptyText="В момента няма активни обяви за коли от Канада. Заявете персонална селекция и ще намерим подходящ автомобил."
        />

        {/* Honest transit + post-arrival (same NA-spec adaptation as the US) */}
        <ImportCards
          title="Срокове, транспорт и стъпките след пристигане"
          items={[
            {
              Icon: ClockIcon,
              t: "Колко време отнема — честно",
              body: (
                <>
                  <p>
                    Морският превоз от канадско пристанище до Европа отнема ориентировъчно{" "}
                    <strong>5–8 седмици</strong> — трансатлантическият маршрут не е засегнат от отклоненията около
                    Африка.
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
                    Канадските автомобили следват северноамериканските стандарти и минават{" "}
                    <strong>индивидуално одобряване</strong> (технотест) с типичните адаптации: европейски (ECE) фарове,
                    заден фар за мъгла и km/h скоростомер.
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

        {/* Nationwide delivery — country+city long-tail as hub content. */}
        <ImportArticle Icon={MapPinIcon} title="Внос на коли от Канада до всяка точка на България">
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
            { href: "/vnos-na-koli-ot-sasht", label: "Внос на коли от САЩ", Icon: FlagUsIcon, flag: true },
            { href: "/kalkulator", label: "Калкулатор за внос", Icon: CalculatorIcon },
          ]}
          ctaId={CTA_ID}
          ctaTitle="Искате кола от Канада?"
          ctaText="Кажете ни марка, модел и бюджет — ще подберем подходящи автомобили с чиста история и ще изготвим персонална калкулация, без скрити такси."
        />

        <ImportBar calcId={CALC_ID} actionsId={ACTIONS_ID} ctaId={CTA_ID} />
      </main>
      <SiteFooter />
      {/* Room for the phone bar at the page's end (phones only, with the bar). */}
      <div className="sa-only-ph h-17.25" aria-hidden="true" />
    </>
  );
}
