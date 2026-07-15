"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/common";
import { LocationIcon } from "@/components/icons";

/**
 * Click-to-load Google Maps embed (ePrivacy / cookie-consent compliant).
 *
 * The Google Maps <iframe> sets Google third-party cookies the instant it loads,
 * which under the Закон за електронните съобщения (ePrivacy) requires prior consent.
 * So we DON'T mount the iframe on page load — we render a static, self-contained
 * placeholder (no network calls, no cookies) and only swap in the real iframe once
 * the user explicitly clicks „Зареди картата". The click IS the consent for this map.
 *
 * State is per-view (useState) — simple and sufficient; we intentionally don't
 * persist it, so each visit starts cookie-free until the user opts in again.
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
      <iframe
        src={src}
        title={title}
        className="block h-115 w-full max-md:h-85"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  return (
    <div className="flex h-115 w-full flex-col items-center justify-center gap-4 bg-[#f2f3f5] px-6 text-center max-md:h-85">
      <LocationIcon className="size-10 text-brand" />
      <p className="m-0 text-base font-extrabold text-ink">{addressLabel}</p>
      <Button
        onClick={() => setLoaded(true)}
        rippleTheme="light"
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
      >
        Зареди картата
      </Button>
      <p className="m-0 max-w-sm text-xs/relaxed text-muted">
        Картата се зарежда от Google Maps, който може да зададе бисквитки. Вижте{" "}
        <Link href="/politika-za-biskvitki/" className="font-semibold text-brand-dark hover:underline">
          Политика за бисквитки
        </Link>
        .
      </p>
    </div>
  );
}
