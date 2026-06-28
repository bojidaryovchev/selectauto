import Link from "next/link";
import { Container, Reveal } from "@/components/common";

const HERO_BG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80";

const CHECK_POINTS = [
  "Проверка на VIN номер",
  "История на щети и инциденти",
  "Данни за пробег и предишни собственици",
];

/** Carfax page hero — imagery background, headline and the "what you can check" card. */
export function CarfaxHero() {
  return (
    <section
      className="relative flex min-h-[82vh] items-end overflow-hidden bg-cover bg-center bg-no-repeat max-md:min-h-[88vh]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 60%, rgba(0,0,0,0.82) 100%), radial-gradient(circle at 20% 16%, rgba(216,111,22,0.20), transparent 24%), radial-gradient(circle at 78% 78%, rgba(216,111,22,0.15), transparent 28%), url('${HERO_BG}')`,
      }}
    >
      <Container className="pb-[70px] max-md:pb-[38px]">
        <div className="grid grid-cols-[1.08fr_0.92fr] items-end gap-7 max-[1100px]:grid-cols-1">
          <Reveal>
            <span className="inline-flex items-center justify-center rounded-full border border-white/[0.14] bg-white/10 px-[18px] py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white">
              SelectAuto • Carfax
            </span>
            <h1 className="mb-4 mt-[18px] max-w-[920px] text-[clamp(44px,7vw,88px)] font-black leading-[0.94] tracking-[-0.04em] text-white">
              Поръчай <span className="text-[#ffd4aa]">Carfax проверка</span> за
              избрания автомобил
            </h1>
            <p className="mb-7 max-w-[760px] text-xl font-medium leading-[1.75] text-white/[0.88]">
              Получи по-ясна представа за историята на автомобила — пробег,
              инциденти, собственици и важни записи преди да вземеш решение.
            </p>

            <div className="flex flex-wrap gap-3.5 max-md:flex-col">
              <Link
                href="#sa-carfax-form-block"
                className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-[linear-gradient(90deg,#b95200,#d86f16)] px-[26px] text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.24)] transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full"
              >
                Изпрати запитване
              </Link>
              <Link
                href="/kontakti/"
                className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] px-[26px] text-[15px] font-extrabold text-white backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full"
              >
                Свържи се с нас
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="rounded-[30px] border border-white/[0.12] bg-[rgba(17,18,22,0.44)] p-7 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md max-md:p-5">
              <h3 className="mb-3.5 text-[26px] font-black leading-[1.08]">
                Какво можеш да провериш
              </h3>
              <p className="mb-[18px] text-base leading-[1.8] text-white/[0.84]">
                Историята на автомобила често казва повече от самата обява.
                Провери важните детайли преди покупка.
              </p>
              <div className="grid gap-2.5">
                {CHECK_POINTS.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.07] px-3.5 py-3 text-sm font-semibold leading-[1.55]"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
