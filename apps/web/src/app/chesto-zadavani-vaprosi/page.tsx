import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/common";
import {
  CalculatorIcon,
  FileSearchIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  ListChecksIcon,
  MessageIcon,
} from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /chesto-zadavani-vaprosi — the top-level FAQ hub (docs/12-web-seo-strategy.md §4.2 + the §3
 * "FAQ-schema / AI-Overview targets" list). Distinct from the page-specific FAQs
 * (calculator / country hubs / VIN): those answer questions in-context; THIS hub
 * aggregates the cross-cutting, high-intent questions (cost, time, duty/VAT,
 * documents, USA-vs-Canada, Carfax/Encar, salvage title, екотакса, КАТ) as
 * self-contained, citable passages — the AI-Overview / Perplexity play (§6).
 *
 * Server component; emits one FAQPage + BreadcrumbList. Answers are FACT-CHECKED
 * (2026): non-EU import = 10% duty + 20% VAT; екотакса is a one-time product tax at
 * first registration (raised Jan 2026); exact amounts vary, so we describe rather
 * than quote figures that could go stale.
 *
 * Look: board `in-faq` (and the frames `in-faq-flow`, `in-faq-all`), its classes in styles/info-faq.css under the
 * page's root class `.in-faq-pg`; parity check docs/design/parity/chesto-zadavani-vaprosi.md. The timing answer
 * carries owner decision 23 (the Korea sentence).
 */

const PATH = "/chesto-zadavani-vaprosi";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Често задавани въпроси за внос на автомобил | SelectAuto",
  description:
    "Отговори на най-честите въпроси за внос на кола от САЩ, Корея и Канада — цена, мито и ДДС, срокове, документи, екотакса, регистрация в КАТ, Carfax и salvage title.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "Често задавани въпроси — внос на автомобил | SelectAuto",
    description: "Цена, мито и ДДС, срокове, документи, екотакса, КАТ, Carfax — ясни отговори.",
    path: PATH,
  }),
};

/** Blueprint §3 curated high-intent questions. Answers are self-contained + citable. */
const FAQ: FaqEntry[] = [
  {
    question: "Колко струва внос на кола от Америка?",
    answer:
      "Крайната цена се състои от цената на автомобила на аукциона, аукционните такси, транспорта до България, митото (10%) и ДДС (20%) при внос от страна извън ЕС, и таксите за регистрация (включително екотакса). За автомобил на стойност около 15 000 $ крайната сума е значително по-висока след добавяне на тези компоненти. Използвайте калкулатора на SelectAuto за ориентировъчна разбивка.",
  },
  {
    question: "Колко време отнема вносът на автомобил?",
    answer:
      "Обичайно 6–10 седмици от спечелването на автомобила на търга до готовност за регистрация в КАТ. Срокът зависи основно от държавата на произход и транспорта (морски превоз + сухопътна логистика) и от оформянето на документите. При внос от Корея срокът е по-дълъг: реалистично 2–3 месеца от покупката до готовност за регистрация в КАТ.",
  },
  {
    question: "Какво мито и ДДС се плащат при внос от страна извън ЕС?",
    answer:
      "При внос на лек автомобил от САЩ, Канада или Корея се дължи мито 10% и ДДС 20%. Митото се начислява върху стойността на автомобила плюс транспорта, а ДДС — върху сумата от стойността, транспорта и митото. Точните ставки зависят от конкретния случай и актуалните тарифи.",
  },
  {
    question: "Какви документи са нужни за внос и регистрация?",
    answer:
      "Обичайно са необходими документ за собственост (title), фактура/договор за покупка, транспортни документи (bill of lading), митническа декларация, както и документите за регистрация в КАТ (застраховка, технически преглед/хомология където е приложимо и сертификат за екотакса). SelectAuto съдейства с оформянето на целия комплект.",
  },
  {
    question: "САЩ или Канада — откъде е по-добре да внеса?",
    answer:
      "САЩ предлага най-голям избор и обем (Copart, IAAI), силно за пикапи и специфични модели. Канада често има автомобили с добре документирана история (Carfax покрива всяка провинция) и чиста собственост. И при двата пазара е важно да се провери title статусът и състоянието; при канадските коли — и корозията (зимна сол). Изборът зависи от конкретния модел и бюджет.",
  },
  {
    question: "Какво е Carfax и Encar?",
    answer:
      "Carfax е услуга за история на автомобил по VIN (собственици, километри, инциденти, регистрации, маркери като salvage/rebuilt) за пазарите в САЩ и Канада. Encar е най-голямата корейска платформа за автомобили втора употреба, чрез която се проверяват диагностика, снимки и история преди наддаване. И двете намаляват риска при внос от разстояние.",
  },
  {
    question: "Какво е salvage / flood title?",
    answer:
      "Salvage title означава автомобил, обявен за тотална щета от застраховател (напр. след сериозна катастрофа), а flood title — щета от наводнение. Такива коли са по-евтини, но изискват внимателна проверка и ремонт. Clean title е автомобил без такава застрахователна щета — най-лесен за внос и регистрация. Проверяваме статуса преди наддаване.",
  },
  {
    question: "Какво е екотакса и колко се плаща?",
    answer:
      "Екотаксата (продуктова такса) е еднократна такса при първа регистрация на внесен автомобил в България — не е годишна и не се дължи при препродажба. Заплаща се на лицензирана организация за оползотворяване на излезли от употреба МПС, която издава сертификат за регистрацията в КАТ. Размерът зависи от вида, горивото и възрастта на автомобила; от януари 2026 г. ставките са увеличени, най-осезаемо за по-старите коли. За точна сума направете запитване.",
  },
  {
    question: "Как се регистрира внесен автомобил в КАТ?",
    answer:
      "След освобождаване от митница автомобилът се застрахова, минава технически преглед (където е приложимо), плаща се екотаксата и се подават документите в КАТ за регистрация и издаване на български номер. SelectAuto предава автомобила готов за този процес и съдейства с необходимите документи.",
  },
];

/** Contextual links so the hub distributes equity to the money pages/tools, with the board's icons and flags. */
const LINKS: { href: string; label: string; Icon: ComponentType<{ className?: string }>; flag?: boolean }[] = [
  { href: "/kalkulator", label: "Калкулатор за внос", Icon: CalculatorIcon },
  { href: "/proverka-vin", label: "Проверка на VIN", Icon: FileSearchIcon },
  { href: "/vnos-na-koli-ot-korea", label: "Внос от Корея", Icon: FlagKrIcon, flag: true },
  { href: "/vnos-na-koli-ot-sasht", label: "Внос от САЩ", Icon: FlagUsIcon, flag: true },
  { href: "/vnos-na-koli-ot-kanada", label: "Внос от Канада", Icon: FlagCaIcon, flag: true },
  { href: "/proces", label: "Процесът стъпка по стъпка", Icon: ListChecksIcon },
];

export default function FaqPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Често задавани въпроси", url: PATH },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="in-faq-pg flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <section className="in-head">
          <div className="sa-wrap in-head__in">
            <nav className="sa-crumbs" aria-label="Пътечка">
              <Link href="/">Начало</Link>
              <i aria-hidden="true">/</i>
              <span aria-current="page">Често задавани въпроси</span>
            </nav>
            <h1 className="type-h1">Често задавани въпроси</h1>
            <p className="sa-lead max-w-[72ch]">
              Най-честите въпроси за внос на автомобил от САЩ, Корея и Канада — цена, мито и ДДС, срокове, документи,
              екотакса и регистрация в КАТ. Ако не намирате отговор, свържете се с нас.
            </p>
          </div>
        </section>

        <section className="sa-band">
          <div className="sa-wrap in-faq">
            {/* FAQ (the kit accordion; every answer stays in the page — matches the FAQPage JSON-LD) */}
            <FaqAccordion items={FAQ} headingLevel={2} look="kit" className="in-acc" />

            {/* Contextual links and the CTA; the column stays in view while the answers scroll (desktop) */}
            <aside className="in-aside top-[calc(var(--header-h)+35px)]">
              <div className="sa-pnl">
                <h2 className="in-aside__h">Полезни страници</h2>
                <nav className="in-links" aria-label="Полезни страници">
                  {LINKS.map(({ href, label, Icon, flag }) => (
                    <Link key={href} href={href} className="sa-chip">
                      <Icon className={flag ? "sa-flag h-3.5 w-5.25" : undefined} />
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="sa-pnl in-cta">
                <span className="sa-pnl__ic">
                  <MessageIcon />
                </span>
                <h2 className="type-h3">Имате друг въпрос?</h2>
                <p className="sa-p">
                  Кажете ни какво ви интересува — ще отговорим и ще изготвим персонална оферта за внос на автомобил.
                </p>
                <InquiryButton variant="pri" size="xl">
                  Направете запитване
                </InquiryButton>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
