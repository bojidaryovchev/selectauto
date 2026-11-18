import { LinkButton, buttonClasses } from "@/components/common";
import { CarfaxInquiryButton } from "@/components/carfax";
import { PhoneIcon, ShieldIcon, ViberIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { CONTACT, SOCIALS } from "@/constants";
import type { CarMarket } from "@/types/car-detail.type";
import type { InquiryPrefill } from "@/types";

const VIBER_HREF = SOCIALS.find((s) => s.label === "Viber")?.href ?? "";

/** The contact panel's id: the phone action bar hides while this panel is on screen. */
export const CONTACT_PANEL_ID = "car-contact";

/**
 * The inquiry pre-answered for this car (brand/model steps skipped, a banner naming the car), when the car has a
 * resolved brand and model; otherwise the generic quiz. Shared by the contact panel and the phone action bar.
 */
export function carInquiryPrefill(car: {
  brand?: string;
  model?: string;
  year?: number;
  lotNumber?: string;
}): InquiryPrefill | undefined {
  const { brand, model, year, lotNumber } = car;
  return brand && model
    ? { brand, model, carLabel: `${brand} ${model}${year ? ` (${year})` : ""}`, lotNumber }
    : undefined;
}

/**
 * The lead-capture panel on the car page (boards `cd-*`, `.cd-contact`): the phone as the main action (owner decision
 * 13), „Направете заявка", „Заявете Carfax проверка" for US and Canadian cars, and „Viber група". The phone and Viber
 * are direct links; „Направете заявка" opens the site-wide inquiry modal. Hidden for concluded/sold cars (a sold lot
 * is not a lead) — the page shows „Вижте активни обяви" instead.
 *
 * When the car has a resolved brand + model, the inquiry opens PRE-ANSWERED for this car (skipping the brand/model quiz
 * steps, starting at budget, with a banner naming the car). Missing brand/model → the generic quiz.
 *
 * „Заявете Carfax проверка" opens the in-page CarfaxDialog pre-filled (and locked) with this car's VIN/make/model, so
 * the buyer only adds their contact details. Only for US/Canada cars (`market !== "kr"`): Carfax is a North-American
 * vehicle-history product, and Encar (KR) lots already render their own insurance/inspection history further down.
 */
export function CarContactPanel({
  title,
  brand,
  model,
  year,
  lotNumber,
  vin,
  market,
}: {
  title: string;
  brand?: string;
  model?: string;
  year?: number;
  lotNumber?: string;
  vin?: string;
  market?: CarMarket;
}) {
  const prefill = carInquiryPrefill({ brand, model, year, lotNumber });

  const showCarfax = market !== "kr";

  return (
    <section id={CONTACT_PANEL_ID} className="sa-pnl cd-contact">
      <p className="cd-ch">Заинтересовани ли сте от този автомобил?</p>
      <p className="sa-small">Свържете се с нас за оферта, оглед на снимки или въпроси по вноса.</p>

      <div className="cd-cta">
        <LinkButton href={CONTACT.phoneHref} variant="pri" block>
          <PhoneIcon />
          {CONTACT.phone}
        </LinkButton>

        <InquiryButton prefill={prefill} variant="sec" block>
          Направете заявка
        </InquiryButton>

        {showCarfax ? (
          <CarfaxInquiryButton vin={vin} make={brand} model={model} lotNumber={lotNumber} variant="ton" block>
            <ShieldIcon />
            Заявете Carfax проверка
          </CarfaxInquiryButton>
        ) : null}

        {VIBER_HREF ? (
          <a
            href={VIBER_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "vb", block: true })}
          >
            <ViberIcon />
            Viber група
          </a>
        ) : null}
      </div>

      <p className="cd-quote">
        Цитирайте лот №, за да намерим бързо {title.length > 40 ? "автомобила" : `„${title}“`}.
      </p>
    </section>
  );
}
