import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/common";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { BUSINESS, CONTACT, SITE_NAME, SITE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Общи условия | SelectAuto",
  description:
    "Общи условия за ползване на сайта и услугите на SelectAuto за внос на автомобили — предмет на услугата, оферти и цени, права и задължения, отговорност, лични данни и решаване на спорове.",
  alternates: { canonical: `${SITE_URL}/obshti-usloviya` },
};

/**
 * /obshti-usloviya — Общи условия (Terms & Conditions). Required for a BG service
 * business under Закона за електронната търговия (ЗЕТ) + Закона за защита на
 * потребителите (ЗЗП). Also carries the ЗЕТ чл. 4 „provider identification"
 * (наименование/ЕИК/седалище/ДДС), rendered from BUSINESS.
 *
 * ⚠️ The legal-entity fields (registeredName/companyId/vatId) are PLACEHOLDERS in
 * `@/constants` until the owner supplies them — section 1 falls back to the contact
 * details + a note while they're blank. This is a solid, BG-law-aware draft, but
 * Общи условия should get a lawyer's review before launch.
 *
 * Static; NAP + entity data from `@/constants`.
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Container className="max-w-215 py-12 max-md:py-8">
          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Общи условия
          </h1>
          <p className="mb-10 text-sm text-muted">Последна актуализация: юли 2026 г.</p>

          <div className="flex flex-col gap-8 text-[15px] leading-[1.8] text-[#3d4046]">
            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">1. Кои сме ние (Доставчик на услугата)</h2>
              <p>
                Настоящите Общи условия уреждат ползването на уебсайта {SITE_URL.replace(/^https?:\/\//, "")} и
                услугите, предоставяни от {BUSINESS.registeredName || SITE_NAME} („SelectAuto&ldquo;, „ние&ldquo;).
              </p>
              {BUSINESS.companyId ? (
                <ul className="ml-5 mt-2 list-disc space-y-1.5">
                  <li>Наименование: {BUSINESS.registeredName || SITE_NAME}</li>
                  <li>ЕИК: {BUSINESS.companyId}</li>
                  {BUSINESS.vatId ? <li>ДДС №: {BUSINESS.vatId}</li> : null}
                  <li>
                    Седалище и адрес на управление: {BUSINESS.registeredOffice.streetAddress},{" "}
                    {BUSINESS.registeredOffice.postalCode} {BUSINESS.registeredOffice.city}, България
                  </li>
                  <li>
                    Адрес на дейност (шоурум): {BUSINESS.streetAddress}, {BUSINESS.postalCode} {BUSINESS.city}
                  </li>
                  <li>
                    Контакт: {CONTACT.phone},{" "}
                    <a href={CONTACT.emailHref} className="font-semibold text-brand-dark hover:underline">
                      {CONTACT.email}
                    </a>
                  </li>
                </ul>
              ) : (
                <p className="mt-2">
                  Може да се свържете с нас на адрес {BUSINESS.streetAddress}, {BUSINESS.postalCode} {BUSINESS.city},
                  България, на телефон {CONTACT.phone} или на имейл{" "}
                  <a href={CONTACT.emailHref} className="font-semibold text-brand-dark hover:underline">
                    {CONTACT.email}
                  </a>
                  .
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">2. Предмет</h2>
              <p>
                SelectAuto предоставя посредническа услуга по подбор, проверка и внос на автомобили от чужбина (Корея,
                САЩ, Канада и др.) — включително съдействие при избор, наддаване/покупка от аукцион, транспорт,
                митническо оформяне и подготовка за регистрация в КАТ. Сайтът предоставя информация, обяви на
                автомобили, инструменти (калкулатор, проверка на VIN) и форми за запитване. Обявите и калкулациите на
                сайта са ориентировъчни и не представляват обвързваща оферта, освен ако изрично не е посочено друго.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">3. Запитване и сключване на договор</h2>
              <p>
                Изпращането на запитване през сайта, по телефон или имейл не поражда задължение за сключване на договор.
                Конкретните условия, крайна цена и срокове за всеки автомобил се договарят индивидуално и се потвърждават
                писмено (включително по имейл) преди възлагане на услугата. Договорът за внос се счита за сключен след
                изрично потвърждение от двете страни.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">4. Цени и оферти</h2>
              <p>
                Ориентировъчните разходи, показани от калкулатора и в обявите, служат единствено за информация.
                Крайната цена включва цената на автомобила, аукционните/платформените такси, транспорта, митото и ДДС
                при внос от страна извън ЕС, както и таксите за регистрация, и се формира за всеки конкретен случай.
                Обвързваща оферта се предоставя писмено след запитване за конкретен автомобил.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">5. Права и задължения на потребителя</h2>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>да предоставя вярна и актуална информация при запитване и при сключване на договор;</li>
                <li>да ползва сайта добросъвестно и в съответствие с приложимото законодателство;</li>
                <li>
                  да не възпроизвежда, копира или използва съдържанието на сайта с търговска цел без наше съгласие.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">6. Отговорност</h2>
              <p>
                Автомобилите се внасят от аукциони и платформи за втора употреба. Полагаме дължима грижа при подбора и
                проверката (включително проверка на история/Carfax при заявка), но не носим отговорност за скрити
                дефекти, неточности в данните на аукциона или обстоятелства извън нашия контрол, доколкото това е
                допустимо от закона. Информацията на сайта се предоставя „както е&ldquo; и може да съдържа технически
                неточности; не гарантираме непрекъснат достъп до сайта.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">7. Лични данни</h2>
              <p>
                Обработваме лични данни съгласно нашата{" "}
                <Link href="/politika-za-poveritelnost/" className="font-semibold text-brand-dark hover:underline">
                  Политика за поверителност
                </Link>{" "}
                и използваме бисквитки съгласно{" "}
                <Link href="/politika-za-biskvitki/" className="font-semibold text-brand-dark hover:underline">
                  Политиката за бисквитки
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">8. Право на отказ</h2>
              <p>
                Когато потребител — физическо лице сключва договор от разстояние или извън търговски обект, той може да
                разполага с право на отказ по реда на Закона за защита на потребителите. Конкретните условия, срокове и
                изключения (например за услуги, започнали с изрично съгласие на потребителя) се уреждат в индивидуалния
                договор. За въпроси относно право на отказ се свържете с нас на{" "}
                <a href={CONTACT.emailHref} className="font-semibold text-brand-dark hover:underline">
                  {CONTACT.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">9. Изменения на условията</h2>
              <p>
                Може да актуализираме тези Общи условия периодично. Актуалната версия е винаги достъпна на тази
                страница, с посочена дата на последна актуализация. Промените влизат в сила от публикуването им.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">10. Приложимо право и спорове</h2>
              <p>
                За неуредените въпроси се прилага българското законодателство. Компетентен орган за защита на
                потребителите е Комисията за защита на потребителите (КЗП) — гр. София, пл. „Славейков&ldquo; № 4а,
                тел. 0700 111 22. При потребителски спорове можете да използвате и платформата за онлайн решаване на
                спорове на Европейската комисия (ODR):{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-dark hover:underline"
                >
                  ec.europa.eu/consumers/odr
                </a>
                .
              </p>
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
