import { LinkButton } from "@/components/common";
import { PhoneIcon, ViberIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { CONTACT, SOCIALS } from "@/constants";
import type { InquiryPrefill } from "@/types";

const VIBER_HREF = SOCIALS.find((s) => s.label === "Viber")?.href ?? "";

/**
 * The lead-capture panel on the detail page — the three legacy CTAs ("Обадете се
 * сега" / "Направете заявка" / "Влез във Viber групата"), modernized. The phone
 * + Viber are direct links; "Направете заявка" opens the site-wide inquiry modal
 * (`InquiryButton`, the only client part). Hidden for concluded/sold cars (a sold
 * lot is not a lead) — the page shows a "back to active inventory" CTA instead.
 *
 * When the car has a resolved brand + model, the inquiry opens PRE-ANSWERED for
 * this car (skipping the brand/model quiz steps, starting at budget, with a banner
 * naming the car). Missing brand/model → the button opens the generic quiz.
 */
export function CarContactPanel({
  title,
  brand,
  model,
  year,
  lotNumber,
}: {
  title: string;
  brand?: string;
  model?: string;
  year?: number;
  lotNumber?: string;
}) {
  const prefill: InquiryPrefill | undefined =
    brand && model
      ? {
          brand,
          model,
          carLabel: `${brand} ${model}${year ? ` (${year})` : ""}`,
          lotNumber,
        }
      : undefined;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
        Заинтересован от този автомобил?
      </p>
      <p className="mb-4 text-sm text-ink">
        Свържи се с нас за оферта, оглед на снимки или въпроси по вноса.
      </p>

      <div className="flex flex-col gap-2.5">
        <LinkButton
          href={CONTACT.phoneHref}
          rippleTheme="light"
          className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-linear-to-r from-brand-dark to-brand px-5 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          <PhoneIcon className="size-5" />
          {CONTACT.phone}
        </LinkButton>

        <InquiryButton
          prefill={prefill}
          className="inline-flex min-h-13 items-center justify-center rounded-full border-2 border-brand bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
        >
          Направете заявка
        </InquiryButton>

        {VIBER_HREF ? (
          <LinkButton
            href={VIBER_HREF}
            rippleTheme="light"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-[#7360f2] px-5 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            <ViberIcon className="size-5" />
            Viber група
          </LinkButton>
        ) : null}
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Цитирай лот №, за да намерим бързо {title.length > 40 ? "автомобила" : `„${title}“`}.
      </p>
    </section>
  );
}
