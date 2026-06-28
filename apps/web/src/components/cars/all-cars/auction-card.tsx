import Image from "next/image";
import Link from "next/link";
import { PhoneIcon, ViberIcon } from "@/components/icons";
import { AuctionCountdown } from "@/components/cars/all-cars/auction-countdown";
import { CONTACT, SOCIALS } from "@/constants";
import type { CarView } from "@/types/car.type";

const VIBER_HREF = SOCIALS.find((s) => s.label === "Viber")?.href ?? "";

/** One labelled cell in the 2-col info grid; renders nothing when value is empty. */
function InfoCell({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-brand" : "text-ink"}`}>{value}</span>
    </div>
  );
}

/**
 * The rich all-cars listing card — ports the legacy `selectauto-auction-card`
 * (image + source/BUY-NOW badges, per-card phone/Viber, status/countdown bar,
 * 2-col info grid, price row, "Подробности"). Server-rendered; only the live
 * countdown is a client child. Data is a `CarView` from `carListingToView`.
 */
export function AuctionCard({ car }: { car: CarView }) {
  const phoneHref = CONTACT.phoneHref;
  const isPast = car.isPast ?? false;
  const isAuction = car.isAuction ?? false;
  const showCountdown = isAuction && !!car.saleDate && !isPast;

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
              className="block aspect-[40/26] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[40/26] w-full items-center justify-center bg-gradient-to-br from-[#2a2d33] to-[#15171b] text-xs font-semibold uppercase tracking-wider text-white/35">
              Снимка при поискване
            </div>
          )}
        </Link>

        {/* Source + status badges (top-left) */}
        <div className="absolute left-3 top-3 z-[2] flex gap-1.5">
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

        {/* Phone / Viber (top-right) — active listings only (a sold car is not a lead) */}
        {!isPast ? (
          <div className="absolute right-3 top-3 z-[2] flex gap-1.5">
            {phoneHref ? (
              <a
                href={phoneHref}
                aria-label="Обади се"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-brand-dark shadow-md transition-transform duration-150 hover:scale-105"
              >
                <PhoneIcon className="h-4 w-4" />
              </a>
            ) : null}
            {VIBER_HREF ? (
              <a
                href={VIBER_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Viber"
                className="grid h-9 w-9 place-items-center rounded-full bg-[#7360f2] text-white shadow-md transition-transform duration-150 hover:scale-105"
              >
                <ViberIcon className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ---- Status / countdown bar ---- */}
      <div
        className={`flex items-center justify-between gap-2 px-4 py-2 ${
          showCountdown ? "bg-[#282d34]" : "bg-[#2f343c]"
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
          {showCountdown ? "Време до търга" : "Статус"}
        </span>
        {showCountdown ? (
          <AuctionCountdown saleDate={car.saleDate!} />
        ) : (
          <span className="text-sm font-bold text-white/90">{car.status ?? "—"}</span>
        )}
      </div>

      {/* ---- Content ---- */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <h3 className="mb-3 line-clamp-2 text-base font-black uppercase leading-tight text-[#153f6b]">
          <Link href={car.href}>{car.title}</Link>
        </h3>

        <div className="mb-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <InfoCell label="Търг №" value={car.lotNumber} />
          <InfoCell label="Пробег" value={car.mileage || undefined} accent />
          <InfoCell label="Състояние" value={car.condition} accent />
          <InfoCell label="Щета" value={car.damage} />
          <InfoCell label="Двигател" value={car.engine} />
          <InfoCell label="Задвижване" value={car.drive} />
          <InfoCell label="Скоростна кутия" value={car.transmission} />
          <InfoCell label="Продавач" value={car.seller} />
        </div>

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
          <Link
            href="/vsichki-avtomobili/"
            className="mt-auto inline-flex min-h-[46px] w-full items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
          >
            Виж активни обяви
          </Link>
        ) : (
          <Link
            href={car.href}
            className="mt-auto inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-5 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Подробности
          </Link>
        )}
      </div>
    </article>
  );
}
