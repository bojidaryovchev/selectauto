import { Container, Reveal } from "@/components/common";

const HERO_BG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80";

/** Contacts page hero — imagery background with the page title. */
export function ContactHero() {
  return (
    <section
      className="relative flex min-h-[62vh] items-end overflow-hidden bg-cover bg-center bg-no-repeat max-md:min-h-[68vh]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 60%, rgba(0,0,0,0.82) 100%), radial-gradient(circle at 20% 16%, rgba(216,111,22,0.20), transparent 24%), radial-gradient(circle at 78% 78%, rgba(216,111,22,0.15), transparent 28%), url('${HERO_BG}')`,
      }}
    >
      <Container className="pb-[70px] max-md:pb-[38px]">
        <Reveal>
          <span className="inline-flex items-center justify-center rounded-full border border-white/[0.14] bg-white/10 px-[18px] py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white">
            SelectAuto • Контакти
          </span>
          <h1 className="mb-4 mt-[18px] max-w-[920px] text-[clamp(44px,7vw,88px)] font-black leading-[0.94] tracking-[-0.04em] text-white">
            Контакти
          </h1>
          <p className="mb-0 max-w-[760px] text-xl font-medium leading-[1.75] text-white/[0.88]">
            Свържете се с нас бързо и лесно – ние сме тук, за да ви съдействаме!
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
