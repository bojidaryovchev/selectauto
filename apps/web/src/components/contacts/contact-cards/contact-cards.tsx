import { Container, Reveal, Ripple } from "@/components/common";
import { ArrowRightIcon, ClockIcon, LocationIcon, MailIcon, PhoneIcon } from "@/components/icons";
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

/** Prefilled "Изпрати имейл" link with a Bulgarian subject line. */
const EMAIL_CTA_HREF = `${CONTACT.emailHref}?subject=${encodeURIComponent("Запитване от selectauto.bg")}`;

/** Shared card shell — white, rounded, brand shadow, hover lift. */
const CARD =
  "flex h-full flex-col rounded-[28px] border border-line bg-white px-[30px] py-8 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-strong max-md:px-5 max-md:py-6";

const ICON_TILE =
  "mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand/[0.12] text-brand-dark";

const HEADING = "mb-1.5 text-[26px] font-black text-[#17181b]";
const SUB = "text-[15px] leading-[1.7] text-[#5a5d64]";

/** Gradient primary CTA, matching the site's brand buttons. `relative
 *  overflow-hidden` host the click <Ripple> dropped into each anchor. */
const CTA =
  "group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-brand px-[18px] py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(216,111,22,0.3)] transition-all duration-200 hover:bg-brand-dark hover:shadow-[0_14px_28px_rgba(216,111,22,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]";

/**
 * The 2×2 grid of contact info cards (phone, address, hours, email) —
 * copy-to-clipboard buttons, a live open/closed badge on the hours card, and
 * quick-action CTAs, built with semantic elements, the app's icons, brand
 * Tailwind tokens, focus-visible rings, and ripples. Interactive bits live in
 * sibling client sub-parts (CopyButton, HoursStatus).
 */
export function ContactCards() {
  return (
    <section className="py-22 max-md:py-14.5">
      <Container>
        <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
          {/* Телефон */}
          <Reveal>
            <article className={CARD}>
              <div className={ICON_TILE} aria-hidden="true">
                <PhoneIcon className="size-7" />
              </div>
              <h2 className={HEADING}>Телефон за връзка</h2>
              <p className={`mb-4 ${SUB}`}>Натисни за обаждане или копирай номера</p>

              <ul className="grid list-none gap-2.5 p-0">
                {[
                  { display: CONTACT.phone, href: CONTACT.phoneHref, raw: "+359898980011" },
                  { display: PHONE_2, href: PHONE_2_HREF, raw: "+359898808661" },
                ].map((p) => (
                  <li
                    key={p.raw}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-[#fafafa] px-3.5 py-3"
                  >
                    <a
                      href={p.href}
                      className="text-[19px] font-black text-[#17181b] transition-colors hover:text-brand-dark max-md:text-[17px]"
                    >
                      {p.display}
                    </a>
                    <CopyButton value={p.raw} label="номер" />
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Бърза връзка", "Отговор в работно време"].map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-line bg-[#fafafa] px-2.5 py-1.5 text-xs font-extrabold text-[#5a5d64]"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </article>
          </Reveal>

          {/* Адрес */}
          <Reveal delay={0.08}>
            <article className={CARD}>
              <div className={ICON_TILE} aria-hidden="true">
                <LocationIcon className="size-7" />
              </div>
              <h2 className={HEADING}>Адрес</h2>
              <p className="mb-3 text-[22px] font-black text-[#17181b]">{ADDRESS}</p>
              <p className={`m-0 ${SUB}`}>
                Намираме се на удобно място с лесен достъп и възможност за
                паркиране.
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-4">
                <a
                  href={NAV_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CTA}
                >
                  Навигация
                  <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <Ripple theme="light" />
                </a>
                <CopyButton value={ADDRESS} label="адрес" />
              </div>
            </article>
          </Reveal>

          {/* Работно време */}
          <Reveal delay={0.04}>
            <article className={CARD}>
              <div className={ICON_TILE} aria-hidden="true">
                <ClockIcon className="size-7" />
              </div>
              <h2 className={HEADING}>Работно време</h2>
              <p className={`mb-4 ${SUB}`}>Винаги добре дошли</p>
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {HOURS.map((h) => (
                  <li
                    key={h.day}
                    className="flex items-center justify-between gap-4 border-b border-line pb-2.5 text-[15px] font-bold text-[#17181b] last:border-0 last:pb-0"
                  >
                    <span>{h.day}</span>
                    <span className="text-brand-dark">{h.time}</span>
                  </li>
                ))}
              </ul>
              <HoursStatus />
            </article>
          </Reveal>

          {/* Имейл */}
          <Reveal delay={0.12}>
            <article className={CARD}>
              <div className={ICON_TILE} aria-hidden="true">
                <MailIcon className="size-7" />
              </div>
              <h2 className={HEADING}>Имейл</h2>
              <p className={`mb-4 ${SUB}`}>
                Пишете ни – отговаряме възможно най-бързо
              </p>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-[#fafafa] px-3.5 py-3">
                <a
                  href={CONTACT.emailHref}
                  className="truncate text-[19px] font-black text-[#17181b] transition-colors hover:text-brand-dark max-md:text-[16px]"
                >
                  {CONTACT.email}
                </a>
                <CopyButton value={CONTACT.email} label="имейл" />
              </div>

              <div className="mt-auto pt-4">
                <a href={EMAIL_CTA_HREF} className={CTA}>
                  Изпрати имейл
                  <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <Ripple theme="light" />
                </a>
              </div>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
