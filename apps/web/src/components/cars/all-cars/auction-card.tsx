import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/common";
import { PhoneIcon, ViberIcon } from "@/components/icons";
import { AuctionCountdown } from "@/components/cars/all-cars/auction-countdown";
import { CONTACT, SOCIALS } from "@/constants";
import type { CarView } from "@/types/car.type";

const VIBER_HREF = SOCIALS.find((s) => s.label === "Viber")?.href ?? "";

/** One labelled cell in the 2-col info grid; renders nothing when empty. Long
 *  values truncate to one line with `…`; the full text shows on hover (`title`). */
function InfoCell({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span
        title={value}
        className={`truncate text-sm font-semibold ${accent ? "text-brand" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}


/**
 * The rich all-cars listing card — ports the legacy `selectauto-auction-card`
 * (image + source/BUY-NOW badges, per-card phone/Viber, status/countdown bar,
 * 2-col info grid, price row, "Подробности"). Server-rendered; only the live
 * countdown is a client child. Data is a `CarView` from `carListingToView`.
 *
 * `priority` is set on the first above-the-fold row so its photos eager-load
 * (the page's LCP candidate); all other cards lazy-load by default as they
 * virtualize into view.
 */

/**
 * `sizes` mirrors the grid's responsive column count (1/2/3/4 by the same
 * breakpoints as `columnsForWidth`), so the optimizer picks a card-sized
 * variant instead of assuming each image is full-viewport-wide (the `next/image`
 * default when `sizes` is omitted, which over-fetches badly in a multi-col grid).
 */
const CARD_IMAGE_SIZES = "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 560px) 50vw, 100vw";

export function AuctionCard({ car, priority = false }: { car: CarView; priority?: boolean }) {
  const phoneHref = CONTACT.phoneHref;
  const isPast = car.isPast ?? false;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(216,111,22,0.14)]">
      {/* ---- Image + overlays ---- */}
      <div className="relative bg-[#f4f4f4]">
        <Link href={car.href} className="block">
          {car.image ? (
            <Image
              src={car.image}
              alt={car.title}
              width={400}
              height={260}
              sizes={CARD_IMAGE_SIZES}
              quality={60}
              // First row eager-loads (LCP); the rest lazy-load as they
              // virtualize in. `priority` is deprecated in Next 16, so set the
              // underlying loading/fetchPriority hints directly.
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="block aspect-[40/26] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[40/26] w-full items-center justify-center bg-gradient-to-br from-[#2a2d33] to-[#15171b] text-xs font-semibold uppercase tracking-wider text-white/35">
              Снимка при поискване
            </div>
          )}
        </Link>

        {/* Source + status badges (top-left) */}
        <div className="absolute left-3 top-3 z-[2] flex flex-wrap gap-1.5">
          <span className="inline-flex min-h-[28px] items-center rounded-full bg-[#163b66] px-3 text-[11px] font-black uppercase tracking-[0.05em] text-white">
            {car.source}
          </span>
          {isPast ? (
            <span className="inline-flex min-h-[28px] items-center rounded-full bg-[#3a3f47] px-3 text-[11px] font-black uppercase tracking-[0.05em] text-white">
              ПРОДАДЕН
            </span>
          ) : car.hasBuyNow ? (
            <span className="inline-flex min-h-[28px] items-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-3 text-[11px] font-black uppercase tracking-[0.05em] text-white">
              BUY NOW
            </span>
          ) : null}
        </div>

        {/* Phone / Viber — active listings only (a sold car is not a lead).
            Centered along the bottom edge of the photo, larger touch targets. */}
        {!isPast ? (
          <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-3">
            {phoneHref ? (
              <LinkButton
                href={phoneHref}
                rippleTheme="light"
                aria-label="Обади се"
                className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-lg ring-2 ring-white/70 transition-transform duration-150 hover:scale-110"
              >
                <PhoneIcon className="h-6 w-6" />
              </LinkButton>
            ) : null}
            {VIBER_HREF ? (
              <LinkButton
                href={VIBER_HREF}
                rippleTheme="light"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Viber"
                className="grid h-12 w-12 place-items-center rounded-full bg-[#7360f2] text-white shadow-lg ring-2 ring-white/70 transition-transform duration-150 hover:scale-110"
              >
                <ViberIcon className="h-6 w-6" />
              </LinkButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ---- Status / countdown bar ----
          Past cards: a static result pill. Active cards: AuctionCountdown owns the
          whole row (label + value) — it shows a live countdown only when the sale
          date is genuinely in the future, else the real status (so a lapsed but
          still-active upstream lot never falsely reads "Приключил"). */}
      <div className="flex items-center justify-between gap-2 bg-[#2f343c] px-4 py-2">
        {isPast ? (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Статус</span>
            <span className="text-sm font-bold text-white/90">{car.status ?? "—"}</span>
          </>
        ) : (
          <AuctionCountdown saleDate={car.saleDate} status={car.status} />
        )}
      </div>

      {/* ---- Content ---- */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <h3
          title={car.title}
          className="mb-3 line-clamp-2 text-base font-black uppercase leading-tight text-[#153f6b]"
        >
          <Link href={car.href}>{car.title}</Link>
        </h3>

        <div className="mb-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <InfoCell label="Търг №" value={car.lotNumber} />
          <InfoCell label="Година" value={car.year ? String(car.year) : undefined} />
          <InfoCell label="Пробег" value={car.mileage || undefined} accent />
          <InfoCell label="Състояние" value={car.condition} accent />
          <InfoCell label="Щета" value={car.damage} />
          <InfoCell label="Цвят" value={car.color} />
          {/* Тип shown in the grid for every vehicle (cars + non-cars alike). */}
          <InfoCell label="Тип" value={car.type} />
          <InfoCell label="Двигател" value={car.engine} />
          <InfoCell label="Задвижване" value={car.drive} />
          <InfoCell label="Скоростна кутия" value={car.transmission} />
          <InfoCell label="Продавач" value={car.seller} />
        </div>

        {/* Footer: price row + CTA, pinned to the bottom of the card so the
            "Buy Now"/price line always sits directly above the button regardless
            of how many info cells the card has. */}
        <div className="mt-auto">
          {car.price ? (
            <div className="mb-3.5 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {isPast ? "Продаден за" : car.hasBuyNow ? "Buy Now" : "Цена"}
              </span>
              <span className="text-xl font-black leading-none text-brand">{car.price}</span>
            </div>
          ) : null}

          {isPast ? (
            // Past cards aren't actionable — they're price-research. Offer a path
            // back to active inventory instead of a "buy this" CTA.
            <LinkButton
              href="/vsichki-avtomobili/"
              rippleTheme="dark"
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
            >
              Виж активни обяви
            </LinkButton>
          ) : (
            <LinkButton
              href={car.href}
              rippleTheme="light"
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-5 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Подробности
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  );
}
