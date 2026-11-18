import { Reveal } from "@/components/common";
import { FacebookIcon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { SocialLink } from "./social-link";

/**
 * Closing panel (board `in-za-nas`): the inquiry on the left, the social links on the right (below it under 1024 px).
 * WhatsApp runs on the main number (owner decision 18).
 */
export function AboutClosing() {
  return (
    <section className="sa-band pt-0">
      <div className="sa-wrap">
        <Reveal>
          <div className="sa-pnl in-close">
            <div className="in-close__l">
              <h2 className="type-h2">Готови ли сте да намерим правилния автомобил за вас?</h2>
              <p className="sa-lead">
                Свържете се с нас и ще изградим ясен план — от избора до доставката и регистрацията.
              </p>
              <InquiryButton variant="pri" size="xl">
                Запитване
              </InquiryButton>
            </div>
            <div className="in-close__r">
              <h3 className="type-h3">Следвайте ни</h3>
              <p className="sa-p">Най-новите автомобили, процеси и реални резултати.</p>
              <div className="in-soc">
                <SocialLink href="https://www.facebook.com/SelectAuto.bg/" label="Facebook">
                  <FacebookIcon />
                </SocialLink>
                <SocialLink href="https://www.instagram.com/selectauto.bg?igsh=MWR4cTltYW0wdTc2OA%3D%3D" label="Instagram">
                  <InstagramIcon />
                </SocialLink>
                <SocialLink href="https://www.tiktok.com/@selectauto.bg" label="TikTok">
                  <TiktokIcon />
                </SocialLink>
                <SocialLink href="https://wa.me/359898980011" label="WhatsApp">
                  <WhatsappIcon />
                </SocialLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
