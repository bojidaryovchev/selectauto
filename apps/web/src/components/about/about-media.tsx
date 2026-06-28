import { Container, Reveal } from "@/components/common";
import { FeatureCard } from "./feature-card";
import { ABOUT_VIDEO_POSTER, ABOUT_VIDEO_SRC } from "./media";

const BENEFITS = [
  "Консултация и помощ при избор",
  "Участие в търгове в Европа и САЩ",
  "Организация на транспорт и регистрация",
  "Актуална пазарна информация",
];

/** Wide media card beside the 5+ card and the "С SelectAuto получаваш" list. */
export function AboutMedia() {
  return (
    <section className="py-[88px] max-md:py-[58px]">
      <Container>
        <div className="grid grid-cols-[1.15fr_0.85fr] items-stretch gap-6 max-[1100px]:grid-cols-1">
          <Reveal>
            <div className="group relative min-h-[540px] overflow-hidden rounded-[30px] shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-[1100px]:min-h-[420px] max-md:min-h-[280px]">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={ABOUT_VIDEO_POSTER}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              >
                <source src={ABOUT_VIDEO_SRC} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.34))]" />
            </div>
          </Reveal>

          <div className="grid gap-6">
            <Reveal delay={0.08}>
              <FeatureCard variant="orange" number="5+" title="Пристанищни бази">
                С добре организирана логистична мрежа гарантираме кратки срокове
                и високо ниво на обслужване.
              </FeatureCard>
            </Reveal>
            <Reveal delay={0.16}>
              <article className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0c0d10,#15171c)] p-[30px] text-white shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-md:p-6">
                <h3 className="mb-4 text-[32px] font-black leading-[1.05] max-md:text-[28px]">
                  С SelectAuto получаваш
                </h3>
                <ul className="m-0 list-disc pl-[22px]">
                  {BENEFITS.map((item) => (
                    <li
                      key={item}
                      className="mb-3 text-lg leading-[1.7] max-md:text-base"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
