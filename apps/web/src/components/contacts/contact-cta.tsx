import { Reveal } from "@/components/common";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { CONTACT } from "@/constants";

/** Free-consultation panel (board `in-kontakti`): its button opens the /zapitvane page, beside the phone and e-mail. */
export function ContactCta() {
  return (
    <section className="sa-band pt-0">
      <div className="sa-wrap">
        <Reveal>
          <div className="sa-pnl in-cta">
            <span className="sa-tag sa-tag--or sa-tag--lg">Безплатно</span>
            <h2 className="type-h2">Безплатна консултация</h2>
            <p className="sa-lead">
              Кажете ни какъв автомобил търсите, а ние ще ви помогнем да стигнете до правилния избор. Започнете
              кратката консултация и ще се свържем с вас.
            </p>
            <InquiryButton variant="pri" size="xl">
              Започнете консултация
            </InquiryButton>
            <div className="in-cta__links">
              <a href={CONTACT.phoneHref} className="sa-btn sa-btn--ton">
                <PhoneIcon />
                {CONTACT.phone}
              </a>
              <a href={CONTACT.emailHref} className="sa-btn sa-btn--ton">
                <MailIcon />
                {CONTACT.email}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
