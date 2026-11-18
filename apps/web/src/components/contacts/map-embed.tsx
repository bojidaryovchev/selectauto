"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/common";
import { MapPinIcon } from "@/components/icons";

/**
 * Click-to-load Google Maps embed (ePrivacy / cookie-consent compliant).
 *
 * The Google Maps <iframe> sets Google third-party cookies the instant it loads,
 * which under the Закон за електронните съобщения (ePrivacy) requires prior consent.
 * So we DON'T mount the iframe on page load — we render a static, self-contained
 * placeholder (no network calls, no cookies) and only swap in the real iframe once
 * the user explicitly clicks „Заредете картата". The click IS the consent for this map.
 *
 * State is per-view (useState) — simple and sufficient; we intentionally don't
 * persist it, so each visit starts cookie-free until the user opts in again.
 *
 * Look: the consent panel of board `in-kontakti` (`.in-map`); the loaded map fills the same box.
 */
interface Props {
  /** The Google Maps embed URL (built server-side from BUSINESS.geo). */
  src: string;
  /** iframe title / accessible name. */
  title: string;
  /** Human-readable address shown on the placeholder. */
  addressLabel: string;
}

export function MapEmbed({ src, title, addressLabel }: Props) {
  const [loaded, setLoaded] = useState(false);

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
      <p className="in-map__a">{addressLabel}</p>
      <Button variant="sec" onClick={() => setLoaded(true)} className="bg-bg">
        <MapPinIcon />
        Заредете картата
      </Button>
      <p className="in-map__n">
        Картата се зарежда от Google Maps, който може да зададе бисквитки. Вижте{" "}
        <Link href="/politika-za-biskvitki">Политика за бисквитки</Link>.
      </p>
    </div>
  );
}
