import type { Metadata } from "next";
import { FinanceToolPage, LeasingCalculator } from "@/components/calculator";
import { BanknoteIcon, CalculatorIcon, CalendarIcon, PercentIcon, WalletIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildWebApplicationJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  title: "Лизингов калкулатор — месечна вноска за автомобил | SelectAuto",
  description:
    "Изчислете месечната лизингова вноска за автомобил: цена, първоначална вноска, срок и ГПР. Прозрачна разбивка на кредита, лихвата и общата стойност. Онлайн калкулатор на SelectAuto.",
  alternates: { canonical: `${SITE_URL}/lizingov-kalkulator` },
  ...buildSocialMeta({
    title: "Лизингов калкулатор — месечна вноска за автомобил | SelectAuto",
    description:
      "Изчислете месечната лизингова вноска: цена, първоначална вноска, срок и ГПР — прозрачна разбивка на кредита.",
    path: "/lizingov-kalkulator",
  }),
};

/**
 * /lizingov-kalkulator (boards `im-leasing*`; parity check docs/design/parity/lizingov-kalkulator.md) — a standalone
 * leasing/financing monthly-payment calculator (one of the two „Инструменти" financial tools; the affordability
 * tool lives at /byudzheten-kalkulator). Server component holding the SEO copy +
 * FAQ + JSON-LD; the interactive `<LeasingCalculator>` is a client island. Own
 * top-level slug (keyword „лизингов калкулатор") — cross-linked to the budget
 * calculator and the import-cost calculator.
 */

const FAQ: FaqEntry[] = [
  {
    question: "Как се изчислява месечната лизингова вноска?",
    answer:
      "Месечната вноска се формира от сумата на кредита (цената минус първоначалната вноска), срока в месеци и годишния лихвен процент (ГПР). Калкулаторът използва стандартна анюитетна формула — равни месечни вноски, при които всяка вноска покрива лихва и главница. Резултатът е ориентировъчен и не представлява оферта.",
  },
  {
    question: "Каква първоначална вноска е нужна за лизинг на автомобил?",
    answer:
      "Обичайно първоначалната вноска е между 10% и 30% от цената на автомобила. По-високата първоначална вноска намалява сумата на кредита и месечната вноска, както и общо платената лихва. В калкулатора можете да зададете точна сума или да изберете готов процент.",
  },
  {
    question: "Какво означава ГПР?",
    answer:
      "ГПР (годишен процент на разходите) отразява годишната цена на кредита. Колкото по-нисък е ГПР, толкова по-малка е месечната вноска и общата лихва за целия срок. Реалният ГПР зависи от финансиращата институция, срока и профила на клиента.",
  },
  {
    question: "Обвързваща ли е сумата от калкулатора?",
    answer:
      "Не. Калкулаторът дава ориентировъчна разбивка по зададени от Вас параметри. Реалната оферта зависи от одобрението, конкретния автомобил, аванса и условията на финансиране. За точни условия направете запитване.",
  },
];

export default function LeasingCalculatorPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Лизингов калкулатор", url: "/lizingov-kalkulator" },
  ]);
  const webAppJsonLd = buildWebApplicationJsonLd({
    name: "Лизингов калкулатор",
    description:
      "Онлайн калкулатор за месечна лизингова вноска на автомобил — цена, първоначална вноска, срок и ГПР.",
    url: "/lizingov-kalkulator",
    category: "FinanceApplication",
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

        <FinanceToolPage
          crumb="Лизингов калкулатор"
          title="Лизингов калкулатор"
          lead="Изчислете ориентировъчната месечна вноска за лизинг на автомобил. Задайте цена, първоначална вноска, срок и ГПР, а калкулаторът показва вноската, сумата на кредита, лихвата и общата стойност. За обвързваща оферта направете запитване — изготвяме персонални условия за конкретния автомобил."
          calculator={<LeasingCalculator />}
          explainer={[
            {
              Icon: BanknoteIcon,
              t: "Сума на кредита",
              d: "Цената на автомобила минус първоначалната вноска — сумата, която финансирате.",
            },
            {
              Icon: CalendarIcon,
              t: "Месечна вноска",
              d: "Равната сума, която плащате всеки месец през целия срок на лизинга.",
            },
            {
              Icon: PercentIcon,
              t: "Общо лихва",
              d: "Сборът на лихвата за целия срок — разликата между платеното и сумата на кредита.",
            },
            { Icon: WalletIcon, t: "Общо разходи", d: "Общата стойност на плащанията плюс първоначалната вноска." },
          ]}
          faq={FAQ}
          related={[
            {
              Icon: WalletIcon,
              href: "/byudzheten-kalkulator",
              t: "Бюджетен калкулатор",
              d: "Вижте каква цена автомобил отговаря на месечния Ви бюджет.",
            },
            {
              Icon: CalculatorIcon,
              href: "/kalkulator",
              t: "Калкулатор за внос",
              d: "Ориентировъчна цена за внос от Корея, САЩ или Канада.",
            },
          ]}
          cta={{
            title: "Искате точни условия за лизинг?",
            text: "Кажете ни марка, модел и бюджет — ще изготвим персонална калкулация и ще съдействаме за финансирането.",
          }}
        />
      </main>
      <SiteFooter />
      {/* Room for the phone result bar at the page's end (phones only, with the bar). */}
      <div className="sa-only-ph h-17.25" aria-hidden="true" />
    </>
  );
}
