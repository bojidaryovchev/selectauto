"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to an auction's sale date (the legacy card's
 * `.selectauto-auction-timer-bar`). Renders a ticking "Дд Чч Мм" remaining, or
 * "Аукционът приключи" once the date passes. Client-only because it depends on
 * the current time; the server renders the static status pill alongside it.
 *
 * `saleDate` is an ISO string. If absent, the parent shows a static label
 * instead of mounting this.
 */
export function AuctionCountdown({ saleDate }: { saleDate: string }) {
  const target = new Date(saleDate).getTime();
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

  // Before hydration we render a neutral placeholder to avoid a mismatch.
  if (now === null) {
    return <span className="text-sm font-bold text-white/90 tabular-nums">…</span>;
  }

  const diff = target - now;
  if (!Number.isFinite(target)) {
    return <span className="text-sm font-bold text-white/90">Предстои</span>;
  }
  if (diff <= 0) {
    return <span className="text-sm font-bold text-white/90">Аукционът приключи</span>;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = days > 0 ? `${days}д ${hours}ч ${minutes}м` : `${hours}ч ${minutes}м ${seconds}с`;

  return <span className="text-sm font-bold text-white tabular-nums">{parts}</span>;
}
