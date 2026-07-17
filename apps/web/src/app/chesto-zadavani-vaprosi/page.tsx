import type { Metadata } from "next";
import Link from "next/link";
import { Container, LinkButton } from "@/components/common";
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
      "Обичайно 6–10 седмици от спечелването на автомобила на търга до готовност за регистрация в КАТ. Срокът зависи основно от държавата на произход и транспорта (морски превоз + сухопътна логистика) и от оформянето на документите.",
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

/** Contextual links so the hub distributes equity to the money pages/tools. */
const LINKS: { href: string; label: string }[] = [
  { href: "/kalkulator", label: "Калкулатор за внос" },
  { href: "/proverka-vin", label: "Проверка на VIN" },
  { href: "/vnos-na-koli-ot-korea", label: "Внос от Корея" },
  { href: "/vnos-na-koli-ot-sasht", label: "Внос от САЩ" },
  { href: "/vnos-na-koli-ot-kanada", label: "Внос от Канада" },
  { href: "/proces", label: "Процесът стъпка по стъпка" },
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
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <Container className="max-w-245 py-12 max-md:py-8">
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">Често задавани въпроси</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Често задавани въпроси
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Най-честите въпроси за внос на автомобил от САЩ, Корея и Канада — цена, мито и ДДС, срокове, документи,
            екотакса и регистрация в КАТ. Ако не намираш отговор, свържи се с нас.
          </p>

          {/* FAQ (visible — matches the FAQPage JSON-LD) */}
          <section className="mb-12">
            <div className="flex flex-col gap-4">
              {FAQ.map((f) => (
                <div key={f.question} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h2 className="mb-1.5 text-base font-extrabold text-ink">{f.question}</h2>
                  <p className="text-sm/relaxed text-[#5a5d64]">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contextual links */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-black text-ink">Полезни страници</h2>
            <div className="flex flex-wrap gap-2.5">
              {LINKS.map((l) => (
                <LinkButton
                  key={l.href}
                  href={l.href}
                  rippleTheme="dark"
                  className="inline-flex items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand hover:text-brand-dark"
                >
                  {l.label}
                </LinkButton>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Имаш друг въпрос?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Кажи ни какво те интересува — ще отговорим и ще изготвим персонална оферта за внос на автомобил.
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
