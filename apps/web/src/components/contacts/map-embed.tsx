"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/common";
import { MapPinIcon } from "@/components/icons";

/**
 * Click-to-load Google Maps embed.
 *
 * The Google Maps <iframe> sets Google's third-party cookies the instant it loads. Закон за електронната търговия,
 * чл. 4а (ePrivacy art. 5(3)) allows that only after the visitor is informed and can refuse, unless it is a service
 * the visitor explicitly asked for. So the iframe never mounts on page load: a static placeholder (no network calls, no
 * cookies) shows the notice, and the real map loads only when the visitor presses „Заредете картата".
 *
 * State is per-view (useState) — simple and sufficient; we intentionally don't persist it, so each visit starts
 * cookie-free until the user opts in again.
 *
 * Two looks:
 *  - `page` (default): the contacts page's consent panel (board `in-kontakti`, `.in-map`), with the address;
 *  - `panel`: the car page's map box (`.sa-map` in the seller and location panel, board `cd-*`), compact — the
 *    place is already named above it (owner decision 33, C1: the car-page map loaded on scroll before).
 */
interface Props {
  /** The Google Maps embed URL (built server-side). */
  src: string;
  /** iframe title / accessible name. */
  title: string;
  /** Human-readable address shown on the contacts placeholder. */
  addressLabel?: string;
  look?: "page" | "panel";
}

const NOTICE = (
  <>
    Картата се зарежда от Google Maps, който може да зададе бисквитки. Вижте{" "}
    <Link href="/politika-za-biskvitki" className="underline underline-offset-3">
      Политика за бисквитки
    </Link>
    .
  </>
);

export function MapEmbed({ src, title, addressLabel, look = "page" }: Props) {
  const [loaded, setLoaded] = useState(false);

  if (look === "panel") {
    return loaded ? (
      <div className="sa-map">
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 size-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    ) : (
      <div className="sa-map cd-map">
        <MapPinIcon />
        <Button variant="sec" size="md" onClick={() => setLoaded(true)} className="bg-bg">
          Заредете картата
        </Button>
        <p className="cd-map__n">{NOTICE}</p>
      </div>
    );
  }

  if (loaded) {
    return (
      <div className="in-map p-0">
        <iframe
          src={src}
          title={title}
          className="block size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="in-map">
      <span className="in-map__pin">
        <MapPinIcon />
      </span>
      {addressLabel ? <p className="in-map__a">{addressLabel}</p> : null}
      <Button variant="sec" onClick={() => setLoaded(true)} className="bg-bg">
        <MapPinIcon />
        Заредете картата
      </Button>
      <p className="in-map__n">{NOTICE}</p>
    </div>
  );
}
