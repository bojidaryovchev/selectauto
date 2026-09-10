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
      {/* The hero art is a CSS background on a third-party origin, so the browser
          can't discover it until the style is parsed — too late for an image that
          is almost certainly this page's LCP element. Preload it at high priority
          instead; React hoists this <link> into <head> from wherever it renders.
          The href must match the CSS url() byte-for-byte or the preload is wasted. */}
      <link rel="preload" as="image" href={HERO_BG} fetchPriority="high" />

      {/* On mobile the fixed header is hidden (--header-h collapses to 0); match
          the home hero's top breathing room so the title never jams the top on
          smaller phones where the content grows past the hero's min-height. */}
      <Container className="pb-17.5 max-md:pb-9.5 max-md:pt-[clamp(76px,13vh,128px)]">
        <Reveal>
          <h1 className="mb-4 max-w-230 text-[clamp(44px,7vw,88px)] font-black leading-[0.94] tracking-[-0.04em] text-white">
            Контакти
          </h1>
          <p className="mb-0 max-w-190 text-xl font-medium leading-[1.75] text-white/88">
            Свържете се с нас бързо и лесно – ние сме тук, за да ви съдействаме!
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
