import { memo } from "react";
import Link from "next/link";
import { LinkButton, MakePlate } from "@/components/common";
import { CameraIcon, PhoneIcon, ViberIcon } from "@/components/icons";
import { FavoriteButton } from "@/components/cars/favorite-button";
import { AuctionCountdown } from "@/components/cars/all-cars/auction-countdown";
import { StatusValue } from "@/components/cars/all-cars/status-value";
import { CarCardImage } from "@/components/cars/all-cars/car-card-image";
import { CONTACT, SOCIALS } from "@/constants";
import type { CarView } from "@/types/car.type";

const VIBER_HREF = SOCIALS.find((s) => s.label === "Viber")?.href ?? "";

/** One field of the card. It ALWAYS renders — a missing value shows „—" — so every card has the same rows and a
 *  DETERMINISTIC height: the virtualized catalog depends on uniform rows. Labels and values stay on one line; the
 *  full value shows on hover (`title`). */
function Field({ label, value, mono = false, wide = false }: { label: string; value?: string; mono?: boolean; wide?: boolean }) {
  const shown = value || "—";
  const cls = [mono && value ? "sa-mono" : "", value ? "" : "is-none"].filter(Boolean).join(" ");
  return (
    <div className={wide ? "is-wide" : undefined}>
      <dt>{label}</dt>
      <dd title={shown} className={cls || undefined}>
        {shown}
      </dd>
    </div>
  );
}

/**
 * The car card (board `kit-cards`; parity check docs/design/parity/car-card.md), used wherever cars are listed: the
 * catalog, the home rails, the import hubs, related cars and favourites.
 *
 * - The photo with the source, the favourite heart, and the BUY NOW or „ПРОДАДЕН" mark.
 * - The status strip: a live countdown, or the status with its dot.
 * - The make's logo plate and the title, then all 11 fields, „—" when missing.
 * - The price row: „Продаден за", „Buy Now" or „Цена".
 * - One action row at equal heights: „Подробности", call and Viber; a sold car has „Вижте активни обяви" instead.
 *
 * Renders on the server wherever it's used from one (the hub pages); the live countdown, the heart, the photo and the
 * plate are client children. Data is a `CarView` from `carListingToView`.
 *
 * `priority` eager-loads the first row's photos (the page's LCP candidate); `deferImage` holds the photo back
 * altogether (see CarCardImage); `confirmRemove` asks before un-favouriting (on /lyubimi, where it removes the card).
 */
function AuctionCardImpl({
  car,
  priority = false,
  deferImage = false,
  confirmRemove = false,
}: {
  car: CarView;
  priority?: boolean;
  deferImage?: boolean;
  confirmRemove?: boolean;
}) {
  const phoneHref = CONTACT.phoneHref;
  const isPast = car.isPast ?? false;

  return (
    <article className={`sa-car h-full text-tx ${isPast ? "is-past" : ""}`}>
      <div className="sa-car__ph">
        <Link href={car.href} aria-label={car.title}>
          {car.image ? (
            // Served DIRECTLY from the source CDN (no bake, no Vercel optimizer). See CarCardImage for why it owns an
            // error fallback.
            <CarCardImage
              src={car.image}
              fallback={car.imageFallback}
              alt={car.title}
              priority={priority}
              deferred={deferImage}
            />
          ) : (
            <div className="sa-car__noimg">
              <CameraIcon />
              Снимка при поискване
            </div>
          )}
        </Link>
        <span className="sa-src sa-car__src">{car.source}</span>
        {/* Every real listing (a stable car id) can be saved; a sold car too, for price research. */}
        {car.id !== undefined ? (
          <FavoriteButton carId={car.id} variant="overlay" confirmOnRemove={confirmRemove} className="sa-car__fav" />
        ) : null}
        {isPast ? (
          <span className="sa-tag sa-tag--sold sa-car__mk">{car.isUnsold ? "НЕПРОДАДЕН" : "ПРОДАДЕН"}</span>
        ) : car.hasBuyNow ? (
          <span className="sa-tag sa-tag--buy sa-car__mk">BUY NOW</span>
        ) : null}
      </div>

      {/* Past cards show their result; active ones a live countdown when the sale date is truly ahead, else the
          real status (a lapsed but still-active upstream lot must never read „Приключил"). */}
      <div className="sa-car__clk">
        {isPast ? <StatusValue status={car.status} /> : <AuctionCountdown saleDate={car.saleDate} status={car.status} />}
      </div>

      <div className="sa-car__b">
        <div className="sa-car__hd">
          {car.make ? <MakePlate name={car.make.name} logo={car.make.logo} size="sm" /> : null}
          <h3 className="sa-car__t" title={car.title}>
            <Link href={car.href}>{car.title}</Link>
          </h3>
        </div>

        <dl className="sa-car__dl">
          <Field label="Търг №" value={car.lotNumber} mono />
          <Field label="Година" value={car.year ? String(car.year) : undefined} />
          <Field label="Пробег" value={car.mileage || undefined} />
          <Field label="Състояние" value={car.condition} />
          <Field label="Щета" value={car.damage} />
          <Field label="Цвят" value={car.color} />
          <Field label="Тип" value={car.type} />
          <Field label="Задвижване" value={car.drive} />
          <Field label="Скоростна кутия" value={car.transmission} />
          <Field label="Продавач" value={car.seller} />
          <Field label="Двигател" value={car.engine} wide />
        </dl>

        {/* The price row ALWAYS renders („—" for auction lots priced at the sale): deterministic height again. */}
        <div className="sa-car__pr">
          <span>{isPast ? (car.isUnsold ? "Последна оферта" : "Продаден за") : car.hasBuyNow ? "Buy Now" : "Цена"}</span>
          <b className={car.price ? undefined : "is-none"}>{car.price || "—"}</b>
        </div>

        <div className="sa-car__act">
          {isPast ? (
            // A sold car isn't actionable — it's price research — so it offers the way back to active cars.
            <LinkButton href="/vsichki-avtomobili" variant="sec" size="md" block>
              Вижте активни обяви
            </LinkButton>
          ) : (
            <>
              <LinkButton href={car.href} variant="pri" size="md">
                Подробности
              </LinkButton>
              {phoneHref ? (
                <a href={phoneHref} className="sa-ib" aria-label="Обадете се">
                  <PhoneIcon />
                </a>
              ) : null}
              {VIBER_HREF ? (
                <a href={VIBER_HREF} target="_blank" rel="noopener noreferrer" className="sa-ib sa-ib--vb" aria-label="Viber група">
                  <ViberIcon />
                </a>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Memoized so the virtualized grid — which re-renders on every scroll frame as the visible row window shifts — does
 * not reconcile each card's subtree unless its props actually change. Card `car` objects keep a stable identity
 * across renders (the `cars` array is only spread on append/prepend), so the shallow prop compare is correct.
 */
export const AuctionCard = memo(AuctionCardImpl);
