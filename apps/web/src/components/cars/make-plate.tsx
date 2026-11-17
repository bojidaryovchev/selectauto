"use client";

import { useCallback, useState } from "react";

/** The plate sizes on the Components board: 24 · 32 (cards) · 40 (lists) · 56 · 88 (makes). */
type PlateSize = "xs" | "sm" | "md" | "lg" | "xl";

/** The make's first two letters, for a plate without a logo („ZO" for Zongshen). */
function initials(name: string): string {
  return (name.match(/[\p{L}\p{N}]/gu) ?? []).slice(0, 2).join("").toUpperCase();
}

/**
 * A car make on a light plate, in the logo's own colours (decision 8; Components board, „Табела с логото на
 * марката"). Without a logo, or when the logo fails to load (some `manufacturers.image_url` links are broken), it
 * shows the make's first two letters instead.
 *
 * A client component only for that fallback: an image that fails while the server HTML is still loading fires its
 * error before hydration, so the node is also probed once on mount.
 */
export function MakePlate({ name, logo, size = "md" }: { name: string; logo: string | null; size?: PlateSize }) {
  const [failed, setFailed] = useState(false);
  const probe = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth === 0) setFailed(true);
  }, []);
  const cls = `sa-plate${size === "md" ? "" : ` sa-plate--${size}`}`;
  const showLogo = Boolean(logo) && !failed;

  return (
    // With the letters, the plate itself carries the make's name for screen readers; with a logo, the image does.
    <span className={cls} title={name} role={showLogo ? undefined : "img"} aria-label={showLogo ? undefined : name}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small external SVG/PNG, not worth the optimizer
        <img
          ref={probe}
          src={logo ?? undefined}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <b aria-hidden="true">{initials(name)}</b>
      )}
    </span>
  );
}
