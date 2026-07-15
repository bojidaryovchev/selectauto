import { Container, LinkButton, Reveal } from "@/components/common";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { CONTACT } from "@/constants";

/** Free-consultation CTA card that opens the site-wide inquiry modal. */
export function ContactCta() {
  return (
    <section className="pb-24 max-md:pb-16">
      <Container>
        <Reveal>
          <div className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#111216,#1b1d24)] px-11 py-13 text-center text-white shadow-card-strong max-md:px-6 max-md:py-9">
            <span className="inline-flex items-center justify-center rounded-full border border-white/[0.14] bg-white/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
              Безплатно
            </span>
            <h2 className="mx-auto mb-3.5 mt-4 max-w-190 text-[clamp(30px,3.4vw,42px)] font-black leading-[1.06]">
              Безплатна консултация
            </h2>
            <p className="mx-auto mb-7 max-w-170 text-[17px] leading-[1.85] text-white/82 max-md:text-base">
              Кажи ни какъв автомобил търсиш, а ние ще ти помогнем да стигнеш до
              правилния избор. Започни кратката консултация и ще се свържем с теб.
            </p>

            <InquiryButton
              rippleTheme="light"
              className="inline-flex min-h-14.5 items-center justify-center rounded-full bg-[linear-gradient(90deg,#b95200,#d86f16)] px-9 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(216,111,22,0.28)] transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full"
            >
              Започни консултация
            </InquiryButton>

            <div className="mx-auto mt-9 grid max-w-130 gap-2.5 sm:grid-cols-2">
              <LinkButton
                href={CONTACT.phoneHref}
                rippleTheme="light"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.07] px-4 py-3.5 text-base font-bold transition-colors hover:bg-white/12"
              >
                <PhoneIcon className="size-4.5" />
                {CONTACT.phone}
              </LinkButton>
              <LinkButton
                href={CONTACT.emailHref}
                rippleTheme="light"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.07] px-4 py-3.5 text-base font-bold transition-colors hover:bg-white/12"
              >
                <MailIcon className="size-4.5" />
                {CONTACT.email}
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
