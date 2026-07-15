import type { Metadata } from "next";
import { LeasingCalculator } from "@/components/calculator";
import { Container, LinkButton, Reveal } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type FaqEntry } from "@/lib/site-jsonld";

export const metadata: Metadata = {
  title: "Лизингов калкулатор — месечна вноска за автомобил | SelectAuto",
  description:
    "Изчисли месечната лизингова вноска за автомобил: цена, първоначална вноска, срок и ГПР. Прозрачна разбивка на кредита, лихвата и общата стойност. Онлайн калкулатор на SelectAuto.",
  alternates: { canonical: `${SITE_URL}/lizingov-kalkulator` },
};

/**
 * /lizingov-kalkulator — a standalone leasing/financing monthly-payment
 * calculator (one of the two „Инструменти" financial tools; the affordability
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

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <Container className="max-w-300 py-12 max-md:py-8">
          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Лизингов калкулатор
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Изчислете ориентировъчната месечна вноска за лизинг на автомобил. Задайте цена, първоначална вноска, срок и
            ГПР, а калкулаторът показва вноската, сумата на кредита, лихвата и общата стойност. За обвързваща оферта
            направете запитване — изготвяме персонални условия за конкретния автомобил.
          </p>

          <LeasingCalculator />

          {/* Explainer — real, indexable content */}
          <Reveal className="mt-12">
            <section>
              <h2 className="mb-4 text-2xl font-black text-ink">Как да разчетете резултата</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { t: "Сума на кредита", d: "Цената на автомобила минус първоначалната вноска — сумата, която финансирате." },
                  { t: "Месечна вноска", d: "Равната сума, която плащате всеки месец през целия срок на лизинга." },
                  { t: "Общо лихва", d: "Сборът на лихвата за целия срок — разликата между платеното и сумата на кредита." },
                  { t: "Общо разходи", d: "Общата стойност на плащанията плюс първоначалната вноска." },
                ].map((c) => (
                  <div
                    key={c.t}
                    className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-strong"
                  >
                    <h3 className="mb-1.5 text-lg font-extrabold text-ink">{c.t}</h3>
                    <p className="text-sm/relaxed text-[#5a5d64]">{c.d}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* FAQ (visible — matches the FAQPage JSON-LD) */}
          <Reveal className="mt-12">
            <section>
              <h2 className="mb-4 text-2xl font-black text-ink">Често задавани въпроси</h2>
              <div className="flex flex-col gap-4">
                {FAQ.map((f) => (
                  <div
                    key={f.question}
                    className="rounded-2xl border border-line bg-white p-5 shadow-card transition-colors duration-200 hover:border-brand/40"
                  >
                    <h3 className="mb-1.5 text-base font-extrabold text-ink">{f.question}</h3>
                    <p className="text-sm/relaxed text-[#5a5d64]">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* Cross-links to the other tools */}
          <Reveal className="mt-12">
            <section>
              <h2 className="mb-4 text-2xl font-black text-ink">Свързани инструменти</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <LinkButton
                  href="/byudzheten-kalkulator"
                  rippleTheme="dark"
                  className="group block rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-card-strong"
                >
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink transition-colors group-hover:text-brand-dark">Бюджетен калкулатор</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">Вижте каква цена автомобил отговаря на месечния Ви бюджет.</p>
                </LinkButton>
                <LinkButton
                  href="/kalkulator"
                  rippleTheme="dark"
                  className="group block rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-card-strong"
                >
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink transition-colors group-hover:text-brand-dark">Калкулатор за внос</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">Ориентировъчна цена за внос от Корея, САЩ или Канада.</p>
                </LinkButton>
              </div>
            </section>
          </Reveal>

          {/* CTA */}
          <Reveal className="mt-12">
            <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
              <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Искаш точни условия за лизинг?</h2>
              <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
                Кажи ни марка, модел и бюджет — ще изготвим персонална калкулация и ще съдействаме за финансирането.
              </p>
              <InquiryButton
                rippleTheme="dark"
                className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-8 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
              >
                Направи запитване
              </InquiryButton>
            </section>
          </Reveal>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
