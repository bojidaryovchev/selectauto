import { Container, LinkButton, Reveal } from "@/components/common";
import { CanvasVideo } from "./canvas-video";
import { ABOUT_VIDEO_POSTER, ABOUT_VIDEO_SRC } from "./media";

const HERO_POINTS = [
  "Консултация и помощ при избор",
  "Участие в търгове в Корея, САЩ и Канада",
  "Организация на транспорт и регистрация",
];

/** About hero — full-bleed video background with a glass info card. */
export function AboutHero() {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-black">
      <CanvasVideo src={ABOUT_VIDEO_SRC} poster={ABOUT_VIDEO_POSTER} />

      {/* Gradient + orange-glow overlay */}
      <div className="absolute inset-0 z-1 bg-[linear-gradient(180deg,rgba(0,0,0,0.20)_0%,rgba(0,0,0,0.48)_54%,rgba(0,0,0,0.78)_100%),radial-gradient(circle_at_20%_18%,rgba(216,111,22,0.22),transparent_26%),radial-gradient(circle_at_78%_76%,rgba(216,111,22,0.18),transparent_30%)]" />

      {/* On mobile the fixed header is hidden (--header-h collapses to 0), so
          reserve the same top breathing room the home hero uses — otherwise the
          tall hero content overflows and the h1 jams against the viewport top. */}
      <Container className="relative z-2 pb-18.5 max-md:pb-9.5 max-md:pt-[clamp(76px,13vh,128px)]">
        <div className="grid grid-cols-[1.1fr_0.9fr] items-end gap-8 max-[1100px]:grid-cols-1">
          <div>
            <h1 className="mb-4 max-w-225 text-[clamp(44px,7vw,92px)] font-black leading-[0.94] tracking-[-0.04em] text-white">
              Премиум подход към{" "}
              <span className="text-[#ffd4aa]">вноса на автомобили</span>
            </h1>
            <p className="mb-7 max-w-190 text-xl font-medium leading-[1.75] text-white/88 max-md:text-base">
              В SelectAuto изграждаме сигурен, ясен и професионално управляван
              процес — от правилния избор до логистиката, регистрацията и
              финалното предаване.
            </p>

            <div className="flex flex-wrap gap-3.5 max-md:flex-col">
              <LinkButton
                href="/kontakti"
                rippleTheme="light"
                className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-6.5 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(216,111,22,0.25)] transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full"
              >
                Свържи се с нас
              </LinkButton>
              <LinkButton
                href="/vsichki-avtomobili"
                rippleTheme="light"
                className="inline-flex min-h-13.5 items-center justify-center rounded-full border border-white/18 bg-white/8 px-6.5 text-[15px] font-extrabold text-white backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full"
              >
                Разгледай автомобилите
              </LinkButton>
            </div>
          </div>

          {/* Glass card */}
          <Reveal delay={0.16}>
            <div className="rounded-[30px] border border-white/12 bg-[rgba(17,18,22,0.44)] p-7 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md max-md:p-6">
              <h3 className="mb-3.5 text-[26px] font-black leading-[1.08]">
                Какво получаваш с нас
              </h3>
              <p className="mb-4.5 text-base leading-[1.8] text-white/84">
                Не просто достъп до автомобили, а експертна преценка, прозрачност
                и пълен контрол на всяка стъпка.
              </p>
              <div className="grid gap-2.5">
                {HERO_POINTS.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-white/8 bg-white/[0.07] px-3.5 py-3 text-sm font-semibold leading-[1.55]"
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
