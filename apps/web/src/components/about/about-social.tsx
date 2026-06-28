import Image from "next/image";
import { Container, Reveal } from "@/components/common";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  WhatsappIcon,
} from "@/components/icons";
import { SocialLink } from "./social-link";

/** "Визуално проследяване" + "Следвайте ни" cards beside the logo card. */
export function AboutSocial() {
  return (
    <section className="py-[88px] max-md:py-[58px]">
      <Container>
        <div className="grid grid-cols-[1.15fr_0.85fr] items-stretch gap-6 max-[1100px]:grid-cols-1">
          <div className="grid gap-6">
            <Reveal>
              <article className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0c0d10,#15171c)] p-[30px] text-white shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-md:p-6">
                <h3 className="mb-4 text-[32px] font-black leading-[1.05] max-md:text-[28px]">
                  Визуално проследяване
                </h3>
                <p className="m-0 text-lg leading-[1.85] max-md:text-base">
                  Достъпът до визуално проследяване и личните акаунт мениджъри
                  гарантират, че автомобилът ти е в сигурни ръце.
                </p>
              </article>
            </Reveal>

            <Reveal delay={0.08}>
              <article className="rounded-[30px] bg-[linear-gradient(135deg,#111216,#1b1d24)] px-7 py-8 text-white shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-md:p-6">
                <h3 className="mb-4 text-[34px] font-black leading-[1.05] max-md:text-[28px]">
                  Следвайте ни
                </h3>
                <p className="mb-5 text-[17px] leading-[1.8] text-white/[0.78] max-md:text-base">
                  Бъди близо до нас и виж най-новите автомобили, процеси и реални
                  резултати.
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
              </article>
            </Reveal>
          </div>

          {/* Logo card */}
          <Reveal delay={0.16}>
            <div className="flex min-h-[258px] items-center justify-center rounded-[30px] bg-[linear-gradient(135deg,#0c0d10,#15171c)] p-7 shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-md:min-h-[240px]">
              <Image
                src="/autoselect.jpg"
                alt="SelectAuto About"
                width={320}
                height={200}
                className="block h-auto w-[min(78%,320px)] rounded-2xl object-contain"
              />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
