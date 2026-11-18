import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { CONTACT, SITE_NAME, SITE_URL } from "@/constants";
import { buildSocialMeta } from "@/lib/social-meta";

const TITLE = "Политика за бисквитки | SelectAuto";
const DESCRIPTION =
  "Как SelectAuto използва бисквитки — технически необходими бисквитки за работата на сайта и бисквитки от трети страни (Google Maps). Как да управлявате съгласието и настройките на браузъра си.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/politika-za-biskvitki` },
  // Its own share URL: without this the page inherited the layout's, the home page.
  ...buildSocialMeta({ title: TITLE, description: DESCRIPTION, path: "/politika-za-biskvitki" }),
};

/**
 * /politika-za-biskvitki — standalone Cookie Policy (previously only a §7 blurb in
 * the privacy page). Bulgaria transposes the ePrivacy Directive art. 5(3) in the
 * Закон за електронната търговия, чл. 4а: storing or reading anything on a visitor's
 * device needs the GDPR art. 13 information and a way to refuse, unless it is needed
 * for a service the visitor explicitly asked for (ал. 4, т. 2).
 *
 * Scoped to what the site actually does (verified in code 18.11.2026):
 *  - technically necessary Auth.js cookies (session, CSRF, callback URL);
 *  - browser storage that never reaches the server: the last sign-in method
 *    (localStorage, hooks/use-last-auth-method.ts) and the closed Viber invite
 *    (sessionStorage, components/layout/viber-group-popup.tsx);
 *  - Google Maps on /kontakti and on US/Canada car pages, loaded only on a click
 *    (components/contacts/map-embed.tsx);
 *  - the auction's own 360° viewer and engine video, loaded only when opened;
 *  - Vercel Web Analytics, which sets no cookies (vercel.com/docs/analytics/privacy-policy).
 * Any future analytics or pixel that sets cookies needs a consent banner first. Keep this page in sync.
 *
 * Static. Look: board `in-cookies` (components/legal; parity check docs/design/parity/legal.md). The text is word for
 * word (owner decision 25), with the owner's later fixes: the law named in §1 (decision 30, C3) and §2 brought in line
 * with what the site does (decision 33, C1–C2).
 */
export default function CookiePolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="in-legal-pg flex-1 pt-(--header-h)">
        <LegalDocument
          title="Политика за бисквитки"
          updated="Последна актуализация: ноември 2026 г."
          sections={[
            {
              id: "razdel-1",
              num: "1.",
              title: "Какво са бисквитките",
              content: (
                <p>
                  Бисквитките (cookies) са малки текстови файлове, които се съхраняват на Вашето устройство, когато
                  посещавате уебсайт. Те помагат сайтът да функционира, да запомня Вашата сесия и да работи по-удобно.
                  {" "}
                  {SITE_NAME} използва бисквитки съгласно приложимото законодателство (Закона за електронната търговия и
                  GDPR).
                </p>
              ),
            },
            {
              id: "razdel-2",
              num: "2.",
              title: "Какви бисквитки използваме",
              content: (
                <>
                  <h3>Технически необходими</h3>
                  <p>
                    Използваме бисквитки, които са строго необходими за основната работа на сайта — включително за
                    поддържане на Вашата сесия при вход в потребителски профил (сигурен, подписан идентификатор на
                    сесията). Тези бисквитки не изискват съгласие, тъй като без тях сайтът не може да предостави
                    заявената услуга.
                  </p>
                  <h3>Запомнени в браузъра</h3>
                  <p>
                    Освен бисквитки сайтът запазва в браузъра Ви две отметки, които не се изпращат до нас: начина, по
                    който сте влезли последно (с имейл или с Google), за да Ви го подскаже при следващия вход, и — до
                    затварянето на раздела — че сте затворили поканата за Viber групата.
                  </p>
                  <h3>От трети страни</h3>
                  <p>
                    На страницата{" "}
                    <Link href="/kontakti" className="underline underline-offset-3">
                      Контакти
                    </Link>{" "}
                    и на страниците на автомобилите от САЩ и Канада показваме карта на Google Maps. Тя се зарежда едва
                    след като натиснете „Заредете картата&ldquo;; тогава Google може да постави собствени бисквитки,
                    които се управляват от Google съгласно неговата политика за поверителност. Ако не желаете такива
                    бисквитки, не зареждайте картата.
                  </p>
                  <p>
                    Изгледите 360° и видеата на автомобилите се зареждат от сайта на аукциона само когато ги отворите и
                    могат да поставят негови бисквитки. Статистиката за посещенията (Vercel Web Analytics) не използва
                    бисквитки: посетителят се разпознава по хеш на заявката, а сесията му се изтрива след 24 часа.
                  </p>
                </>
              ),
            },
            {
              id: "razdel-3",
              num: "3.",
              title: "Управление на бисквитките",
              content: (
                <p>
                  Можете по всяко време да изтривате и блокирате бисквитки през настройките на браузъра си (обикновено в
                  раздел „Поверителност&ldquo; или „Настройки на сайтовете&ldquo;). Имайте предвид, че блокирането на
                  технически необходимите бисквитки може да наруши работата на някои функции — например вход в профил.
                </p>
              ),
            },
            {
              id: "razdel-4",
              num: "4.",
              title: "Връзка с личните данни",
              content: (
                <p>
                  Повече за това как обработваме лични данни ще намерите в нашата{" "}
                  <Link href="/politika-za-poveritelnost" className="underline underline-offset-3">
                    Политика за поверителност
                  </Link>
                  . За въпроси относно бисквитките пишете ни на{" "}
                  <a href={CONTACT.emailHref} className="underline underline-offset-3">
                    {CONTACT.email}
                  </a>
                  .
                </p>
              ),
            },
            {
              id: "razdel-5",
              num: "5.",
              title: "Промени",
              content: (
                <p>
                  Може да актуализираме тази политика при промяна в използваните бисквитки. Актуалната версия е винаги
                  достъпна на тази страница, с посочена дата на последна актуализация.
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
