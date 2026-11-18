import { Reveal } from "@/components/common";
import { ArrowRightIcon, ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { BUSINESS, CONTACT } from "@/constants";
import { CopyButton } from "./copy-button";
import { HoursStatus } from "./hours-status";

/** Second phone line shown only on the contacts page. */
const PHONE_2 = "+359 898 808 661";
const PHONE_2_HREF = "tel:+359898808661";

const HOURS = [
  { day: "Понеделник – Петък", time: "09:00 – 18:00" },
  { day: "Събота", time: "09:00 – 17:00" },
  { day: "Неделя", time: "11:00 – 17:00" },
];

const ADDRESS = `гр. ${BUSINESS.city}, ${BUSINESS.streetAddress}`;

/** Modern Google Maps deep link (opens directions to the address). */
const NAV_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;

/** Prefilled "Изпратете имейл" link with a Bulgarian subject line. */
const EMAIL_CTA_HREF = `${CONTACT.emailHref}?subject=${encodeURIComponent("Запитване от selectauto.bg")}`;

/**
 * The four contact cards (board `in-kontakti`): the phones with „Копирайте", the address with „Навигация" and
 * „Копирайте", the hours with the live open/closed line, and the e-mail with „Копирайте" and „Изпратете имейл". Two
 * columns while each can be 440 px wide, one below. The interactive parts are client components (CopyButton,
 * HoursStatus).
 */
export function ContactCards() {
  return (
    <section className="sa-band">
      <div className="sa-wrap in-cards">
        {/* Телефон */}
        <Reveal className="grid">
          <article className="sa-pnl in-card">
            <span className="sa-pnl__ic">
              <PhoneIcon />
            </span>
            <div className="in-card__h">
              <h2>Телефон за връзка</h2>
              <p className="sa-p">Натиснете за обаждане или копирайте номера</p>
            </div>
            <ul className="in-rows">
              {[
                { display: CONTACT.phone, href: CONTACT.phoneHref, raw: "+359898980011" },
                { display: PHONE_2, href: PHONE_2_HREF, raw: "+359898808661" },
              ].map((p) => (
                <li key={p.raw} className="in-line">
                  <a href={p.href}>{p.display}</a>
                  <CopyButton value={p.raw} label="номер" />
                </li>
              ))}
            </ul>
            <div className="sa-row gap-2">
              <span className="sa-tag sa-tag--lg">
                <PhoneIcon />
                Бърза връзка
              </span>
              <span className="sa-tag sa-tag--lg">
                <ClockIcon />
                Отговор в работно време
              </span>
            </div>
          </article>
        </Reveal>

        {/* Адрес */}
        <Reveal delay={0.08} className="grid">
          <article className="sa-pnl in-card">
            <span className="sa-pnl__ic">
              <MapPinIcon />
            </span>
            <div className="in-card__h">
              <h2>Адрес</h2>
            </div>
            <p className="in-addr">{ADDRESS}</p>
            <p className="sa-p">Намираме се на удобно място с лесен достъп и възможност за паркиране.</p>
            <div className="in-act">
              <a href={NAV_HREF} target="_blank" rel="noopener noreferrer" className="sa-btn sa-btn--sec sa-btn--md">
                Навигация
                <ArrowRightIcon />
              </a>
              <CopyButton value={ADDRESS} label="адрес" />
            </div>
          </article>
        </Reveal>

        {/* Работно време */}
        <Reveal delay={0.04} className="grid">
          <article className="sa-pnl in-card">
            <span className="sa-pnl__ic">
              <ClockIcon />
            </span>
            <div className="in-card__h">
              <h2>Работно време</h2>
              <p className="sa-p">Винаги добре дошли</p>
            </div>
            <ul className="in-hours">
              {HOURS.map((h) => (
                <li key={h.day}>
                  <span>{h.day}</span>
                  <span>{h.time}</span>
                </li>
              ))}
            </ul>
            <HoursStatus />
          </article>
        </Reveal>

        {/* Имейл */}
        <Reveal delay={0.12} className="grid">
          <article className="sa-pnl in-card">
            <span className="sa-pnl__ic">
              <MailIcon />
            </span>
            <div className="in-card__h">
              <h2>Имейл</h2>
              <p className="sa-p">Пишете ни – отговаряме възможно най-бързо</p>
            </div>
            <div className="in-line">
              <a href={CONTACT.emailHref}>{CONTACT.email}</a>
              <CopyButton value={CONTACT.email} label="имейл" />
            </div>
            <div className="in-act">
              <a href={EMAIL_CTA_HREF} className="sa-btn sa-btn--sec sa-btn--md">
                Изпратете имейл
                <ArrowRightIcon />
              </a>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
