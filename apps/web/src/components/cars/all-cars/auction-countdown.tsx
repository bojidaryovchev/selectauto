"use client";

import { useEffect, useState } from "react";

/**
 * The active card's status/time bar CONTENTS (label on the left, value on the
 * right) — the legacy `.selectauto-auction-timer-bar`. Client-only because the
 * choice of what to show depends on the current time, which a cached SSR query
 * can't read.
 *
 * Three cases:
 *  - **Future sale date** → "Време до търга" + a live ticking countdown.
 *  - **Past sale date but still an active listing** → "Статус" + the real status
 *    pill. The upstream sometimes keeps an old `sale_date` on a lot it still
 *    reports as active (`sale`/`upcoming`) — a relisted/postponed auction. We must
 *    NOT claim "Приключил" for those (~0.3% of active rows); the status is the
 *    truth, not the stale date.
 *  - **No sale date** → "Статус" + the status pill (buy-now / no-schedule lots).
 *
 * `saleDate` is an ISO string (or undefined). `status` is the already-localized
 * BG status label, shown as the fallback when there's no live countdown.
 */
export function AuctionCountdown({ saleDate, status }: { saleDate?: string; status?: string }) {
  const target = saleDate ? new Date(saleDate).getTime() : NaN;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Set the first value on the next tick (not synchronously in the effect body,
    // which would cascade-render), then keep ticking every second.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const statusFallback = status ?? "—";
  const diff = now !== null && Number.isFinite(target) ? target - now : NaN;
  // A live countdown only when the sale date is genuinely in the future.
  const isLive = Number.isFinite(diff) && diff > 0;

  // Before hydration (now === null) we can't know if the date is future or past,
  // so render the neutral status fallback to avoid a hydration mismatch and an
  // "ended"/countdown flash.
  if (!isLive) {
    return (
      <>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Статус</span>
        <span className="whitespace-nowrap text-sm font-bold text-white/90">{statusFallback}</span>
      </>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Always include seconds so the countdown visibly ticks (drop the day part
  // only once we're under a day, to keep it compact).
  const parts = days > 0 ? `${days}д ${hours}ч ${minutes}м ${seconds}с` : `${hours}ч ${minutes}м ${seconds}с`;

  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Време до търга</span>
      <span className="whitespace-nowrap text-sm font-bold text-white tabular-nums">{parts}</span>
    </>
  );
}
