import { Container, Reveal } from "@/components/common";
import { CONTACT } from "@/constants";

/** Second phone line shown only on the contacts page. */
const PHONE_2 = "+359 876 667 633";
const PHONE_2_HREF = "tel:+359876667633";

const HOURS = [
  { day: "Понеделник – Петък", time: "09:00 – 18:00" },
  { day: "Събота", time: "9:00 – 17:00" },
  { day: "Неделя", time: "11:00 – 17:00" },
];

const ADDRESS = "гр. Пловдив, ул. Север 64";

/** The 2×2 grid of contact info cards (phone, address, hours, email). */
export function ContactCards() {
  return (
    <section className="py-[88px] max-md:py-[58px]">
      <Container>
        <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
          {/* Телефон */}
          <Reveal>
            <article className="h-full rounded-[28px] border border-line bg-white px-[30px] py-8 shadow-card max-md:px-5 max-md:py-6">
              <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand/[0.12] text-[28px]">
                📱
              </div>
              <h2 className="mb-1.5 text-[26px] font-black text-[#17181b]">
                Телефон за връзка
              </h2>
              <p className="mb-4 text-[15px] leading-[1.7] text-[#5a5d64]">
                Натисни за обаждане или копирай номера
              </p>
              <div className="grid gap-2">
                <a
                  href={CONTACT.phoneHref}
                  className="text-[22px] font-black text-[#17181b] transition-colors hover:text-brand-dark"
                >
                  {CONTACT.phone}
                </a>
                <a
                  href={PHONE_2_HREF}
                  className="text-[22px] font-black text-[#17181b] transition-colors hover:text-brand-dark"
                >
                  {PHONE_2}
                </a>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#8a8d94]">
                Бърза връзка · Отговор в работно време
              </p>
            </article>
          </Reveal>

          {/* Адрес */}
          <Reveal delay={0.08}>
            <article className="h-full rounded-[28px] border border-line bg-white px-[30px] py-8 shadow-card max-md:px-5 max-md:py-6">
              <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand/[0.12] text-[28px]">
                📍
              </div>
              <h2 className="mb-1.5 text-[26px] font-black text-[#17181b]">
                Адрес
              </h2>
              <p className="mb-3 text-[22px] font-black text-[#17181b]">
                {ADDRESS}
              </p>
              <p className="m-0 text-[15px] leading-[1.7] text-[#5a5d64]">
                Намираме се на удобно място с лесен достъп и възможност за
                паркиране.
              </p>
            </article>
          </Reveal>

          {/* Работно време */}
          <Reveal delay={0.04}>
            <article className="h-full rounded-[28px] border border-line bg-white px-[30px] py-8 shadow-card max-md:px-5 max-md:py-6">
              <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand/[0.12] text-[28px]">
                🕒
              </div>
              <h2 className="mb-1.5 text-[26px] font-black text-[#17181b]">
                Работно време
              </h2>
              <p className="mb-4 text-[15px] leading-[1.7] text-[#5a5d64]">
                Винаги добре дошли
              </p>
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
            </article>
          </Reveal>

          {/* Имейл */}
          <Reveal delay={0.12}>
            <article className="h-full rounded-[28px] border border-line bg-white px-[30px] py-8 shadow-card max-md:px-5 max-md:py-6">
              <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand/[0.12] text-[28px]">
                ✉️
              </div>
              <h2 className="mb-1.5 text-[26px] font-black text-[#17181b]">
                Имейл
              </h2>
              <p className="mb-4 text-[15px] leading-[1.7] text-[#5a5d64]">
                Пишете ни – отговаряме възможно най-бързо
              </p>
              <a
                href={CONTACT.emailHref}
                className="text-[22px] font-black text-[#17181b] transition-colors hover:text-brand-dark"
              >
                {CONTACT.email}
              </a>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
