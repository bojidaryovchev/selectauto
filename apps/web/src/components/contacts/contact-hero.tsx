import { Container, Reveal } from "@/components/common";

const HERO_BG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80";

/** The tint over the photo — darkening for the copy plus two brand-orange glows. */
const HERO_OVERLAY =
  "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 60%, rgba(0,0,0,0.82) 100%), radial-gradient(circle at 20% 16%, rgba(216,111,22,0.20), transparent 24%), radial-gradient(circle at 78% 78%, rgba(216,111,22,0.15), transparent 28%)";

/** Contacts page hero — imagery background with the page title. */
export function ContactHero() {
  return (
    <section className="relative isolate flex min-h-[62vh] items-end overflow-hidden max-md:min-h-[68vh]">
      {/* The hero art is almost certainly this page's LCP element, so it has to be
          found early — but NOT through a preload. It used to be a CSS background
          plus <link rel="preload">, and React serialises a preload into the route's
          RSC payload as a hint that the client acts on at PREFETCH time: every page
          with the nav in view (i.e. all of them) downloaded this ~90KB photo at
          high priority without ever showing it. A bare eager <img> does the same —
          React preloads those too — except inside <picture>, which it leaves alone
          (the sources could differ per viewport). So: a real <img> the browser's
          preload scanner finds in the HTML at once, wrapped in a <picture> so that
          no hint is emitted for it. */}
      <picture>
        <img
          src={HERO_BG}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
      </picture>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: HERO_OVERLAY }}
      />

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
