import { Container, Reveal } from "@/components/common";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  WhatsappIcon,
} from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { SocialLink } from "./social-link";

/**
 * Closing band — merges the old separate "Следвайте ни" social card and the
 * standalone CTA strip into one panel, and drops the filler logo card. Left: the
 * inquiry CTA; right: the social links.
 */
export function AboutClosing() {
  return (
    <section className="py-22 max-md:py-14.5">
      <Container>
        <Reveal>
          <div className="grid grid-cols-[1.4fr_1fr] items-center gap-10 rounded-4xl bg-[linear-gradient(90deg,#111216,#1b1d24)] p-11.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-[900px]:grid-cols-1 max-[900px]:gap-8 max-md:p-6">
            <div>
              <h2 className="mb-3 text-[clamp(28px,3vw,46px)] font-black leading-[1.04]">
                Готов ли си да намерим правилния автомобил за теб?
              </h2>
              <p className="mb-7 max-w-190 text-lg leading-[1.8] text-white/82 max-md:text-base">
                Свържи се с нас и ще изградим ясен план — от избора до доставката
                и регистрацията.
              </p>
              <InquiryButton
                rippleTheme="light"
                className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-6.5 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(216,111,22,0.25)] transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full"
              >
                Запитване
              </InquiryButton>
            </div>

            <div className="border-l border-white/12 pl-10 max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:pl-0 max-[900px]:pt-8">
              <h3 className="mb-2 text-2xl font-black leading-[1.1]">
                Следвайте ни
              </h3>
              <p className="mb-5 text-[15px] leading-[1.75] text-white/72">
                Най-новите автомобили, процеси и реални резултати.
              </p>
              <div className="flex flex-wrap gap-3.5">
                <SocialLink
                  href="https://www.facebook.com/SelectAuto.bg/"
                  label="Facebook"
                >
                  <FacebookIcon />
                </SocialLink>
                <SocialLink
                  href="https://www.instagram.com/selectauto.bg?igsh=MWR4cTltYW0wdTc2OA%3D%3D"
                  label="Instagram"
                >
                  <InstagramIcon />
                </SocialLink>
                <SocialLink
                  href="https://www.tiktok.com/@selectauto.bg"
                  label="TikTok"
                >
                  <TiktokIcon />
                </SocialLink>
                <SocialLink href="#" label="WhatsApp">
                  <WhatsappIcon />
                </SocialLink>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
