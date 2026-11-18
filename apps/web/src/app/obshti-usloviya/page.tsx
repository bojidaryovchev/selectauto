import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { BUSINESS, CONTACT, SITE_NAME, SITE_URL } from "@/constants";
import { buildSocialMeta } from "@/lib/social-meta";

const TITLE = "Общи условия | SelectAuto";
const DESCRIPTION =
  "Общи условия за ползване на сайта и услугите на SelectAuto за внос на автомобили — предмет на услугата, оферти и цени, права и задължения, отговорност, лични данни и решаване на спорове.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/obshti-usloviya` },
  // Its own share URL: without this the page inherited the layout's, the home page.
  ...buildSocialMeta({ title: TITLE, description: DESCRIPTION, path: "/obshti-usloviya" }),
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
 * Static; NAP + entity data from `@/constants`. Look: board `in-terms` (components/legal; parity check
 * docs/design/parity/legal.md): the provider's details as an identity card. The text is word for word (owner
 * decision 25).
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="in-legal-pg flex-1 pt-(--header-h)">
        <LegalDocument
          title="Общи условия"
          updated="Последна актуализация: юли 2026 г."
          sections={[
            {
              id: "razdel-1",
              num: "1.",
              title: "Кои сме ние (Доставчик на услугата)",
              content: (
                <>
                  <p>
                    Настоящите Общи условия уреждат ползването на уебсайта {SITE_URL.replace(/^https?:\/\//, "")} и
                    услугите, предоставяни от {BUSINESS.registeredName || SITE_NAME} („SelectAuto&ldquo;, „ние&ldquo;).
                  </p>
                  {BUSINESS.companyId ? (
                    <ul className="in-ids">
                      <li>
                        <span>Наименование:</span> {BUSINESS.registeredName || SITE_NAME}
                      </li>
                      <li>
                        <span>ЕИК:</span> {BUSINESS.companyId}
                      </li>
                      {BUSINESS.vatId ? (
                        <li>
                          <span>ДДС №:</span> {BUSINESS.vatId}
                        </li>
                      ) : null}
                      <li>
                        <span>Седалище и адрес на управление:</span> {BUSINESS.registeredOffice.streetAddress},{" "}
                        {BUSINESS.registeredOffice.postalCode} {BUSINESS.registeredOffice.city}, България
                      </li>
                      <li>
                        <span>Адрес на дейност (шоурум):</span> {BUSINESS.streetAddress}, {BUSINESS.postalCode}{" "}
                        {BUSINESS.city}
                      </li>
                      <li>
                        <span>Контакт:</span> {CONTACT.phone},{" "}
                        <a href={CONTACT.emailHref} className="underline underline-offset-3">
                          {CONTACT.email}
                        </a>
                      </li>
                    </ul>
                  ) : (
                    <p>
                      Може да се свържете с нас на адрес {BUSINESS.streetAddress}, {BUSINESS.postalCode} {BUSINESS.city},
                      България, на телефон {CONTACT.phone} или на имейл{" "}
                      <a href={CONTACT.emailHref} className="underline underline-offset-3">
                        {CONTACT.email}
                      </a>
                      .
                    </p>
                  )}
                </>
              ),
            },
            {
              id: "razdel-2",
              num: "2.",
              title: "Предмет",
              content: (
                <p>
                  SelectAuto предоставя посредническа услуга по подбор, проверка и внос на автомобили от чужбина (Корея,
                  САЩ, Канада и др.) — включително съдействие при избор, наддаване/покупка от аукцион, транспорт,
                  митническо оформяне и подготовка за регистрация в КАТ. Сайтът предоставя информация, обяви на
                  автомобили, инструменти (калкулатор, проверка на VIN) и форми за запитване. Обявите и калкулациите на
                  сайта са ориентировъчни и не представляват обвързваща оферта, освен ако изрично не е посочено друго.
                </p>
              ),
            },
            {
              id: "razdel-3",
              num: "3.",
              title: "Запитване и сключване на договор",
              content: (
                <p>
                  Изпращането на запитване през сайта, по телефон или имейл не поражда задължение за сключване на
                  договор. Конкретните условия, крайна цена и срокове за всеки автомобил се договарят индивидуално и се
                  потвърждават писмено (включително по имейл) преди възлагане на услугата. Договорът за внос се счита за
                  сключен след изрично потвърждение от двете страни.
                </p>
              ),
            },
            {
              id: "razdel-4",
              num: "4.",
              title: "Цени и оферти",
              content: (
                <p>
                  Ориентировъчните разходи, показани от калкулатора и в обявите, служат единствено за информация.
                  Крайната цена включва цената на автомобила, аукционните/платформените такси, транспорта, митото и ДДС
                  при внос от страна извън ЕС, както и таксите за регистрация, и се формира за всеки конкретен случай.
                  Обвързваща оферта се предоставя писмено след запитване за конкретен автомобил.
                </p>
              ),
            },
            {
              id: "razdel-5",
              num: "5.",
              title: "Права и задължения на потребителя",
              content: (
                <ul>
                  <li>да предоставя вярна и актуална информация при запитване и при сключване на договор;</li>
                  <li>да ползва сайта добросъвестно и в съответствие с приложимото законодателство;</li>
                  <li>
                    да не възпроизвежда, копира или използва съдържанието на сайта с търговска цел без наше съгласие.
                  </li>
                </ul>
              ),
            },
            {
              id: "razdel-6",
              num: "6.",
              title: "Отговорност",
              content: (
                <p>
                  Автомобилите се внасят от аукциони и платформи за втора употреба. Полагаме дължима грижа при подбора и
                  проверката (включително проверка на история/Carfax при заявка), но не носим отговорност за скрити
                  дефекти, неточности в данните на аукциона или обстоятелства извън нашия контрол, доколкото това е
                  допустимо от закона. Информацията на сайта се предоставя „както е&ldquo; и може да съдържа технически
                  неточности; не гарантираме непрекъснат достъп до сайта.
                </p>
              ),
            },
            {
              id: "razdel-7",
              num: "7.",
              title: "Лични данни",
              content: (
                <p>
                  Обработваме лични данни съгласно нашата{" "}
                  <Link href="/politika-za-poveritelnost" className="underline underline-offset-3">
                    Политика за поверителност
                  </Link>{" "}
                  и използваме бисквитки съгласно{" "}
                  <Link href="/politika-za-biskvitki" className="underline underline-offset-3">
                    Политиката за бисквитки
                  </Link>
                  .
                </p>
              ),
            },
            {
              id: "razdel-8",
              num: "8.",
              title: "Право на отказ",
              content: (
                <p>
                  Когато потребител — физическо лице сключва договор от разстояние или извън търговски обект, той може
                  да разполага с право на отказ по реда на Закона за защита на потребителите. Конкретните условия,
                  срокове и изключения (например за услуги, започнали с изрично съгласие на потребителя) се уреждат в
                  индивидуалния договор. За въпроси относно право на отказ се свържете с нас на{" "}
                  <a href={CONTACT.emailHref} className="underline underline-offset-3">
                    {CONTACT.email}
                  </a>
                  .
                </p>
              ),
            },
            {
              id: "razdel-9",
              num: "9.",
              title: "Изменения на условията",
              content: (
                <p>
                  Може да актуализираме тези Общи условия периодично. Актуалната версия е винаги достъпна на тази
                  страница, с посочена дата на последна актуализация. Промените влизат в сила от публикуването им.
                </p>
              ),
            },
            {
              id: "razdel-10",
              num: "10.",
              title: "Приложимо право и спорове",
              content: (
                <p>
                  За неуредените въпроси се прилага българското законодателство. Компетентен орган за защита на
                  потребителите е Комисията за защита на потребителите (КЗП) — гр. София, пл. „Славейков&ldquo; № 4а,
                  тел. 0700 111 22. При потребителски спорове можете да използвате и платформата за онлайн решаване на
                  спорове на Европейската комисия (ODR):{" "}
                  <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-3">
                    ec.europa.eu/consumers/odr
                  </a>
                  .
                </p>
              ),
            },
          ]}
        />
      </main>
      <SiteFooter />
    </>
  );
}
