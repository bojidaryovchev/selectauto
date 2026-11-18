"use client";

import { useEffect, useState } from "react";
import { StatusValue } from "./status-value";

/**
 * The active card's status strip CONTENTS (`.sa-car__clk`: label on the left, value on the right; board
 * `kit-cards`). Client-only because the choice of what to show depends on the current time, which a cached SSR
 * query can't read.
 *
 * Three cases:
 *  - **Future sale date** → „Време до търга" and a live countdown: digits in mono, units in Manrope, orange under
 *    24 hours, days only from one day up.
 *  - **Past sale date but still an active listing** → „Статус" and the real status. The upstream sometimes keeps an
 *    old `sale_date` on a lot it still reports as active (a relisted or postponed auction). We must NOT claim
 *    „Приключил" for those; the status is the truth, not the stale date.
 *  - **No sale date** → „Статус" and the status (buy-now and unscheduled lots).
 *
 * A status shows a dot coloured by whether a buyer can act (lib/car-status-tone.ts).
 *
 * `saleDate` is an ISO string (or undefined). `status` is the already-localized BG status label.
 */
export function AuctionCountdown({
  saleDate,
  status,
  labelAs: Label = "span",
}: {
  saleDate?: string;
  status?: string;
  /** The label's element: `small` in the phone action bar (the kit's `.sa-bar`), `span` in the strips. */
  labelAs?: "span" | "small";
}) {
  const target = saleDate ? new Date(saleDate).getTime() : NaN;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Set the first value on the next tick (not synchronously in the effect body, which would cascade-render), then
    // keep ticking every second.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const diff = now !== null && Number.isFinite(target) ? target - now : NaN;
  // A live countdown only when the sale date is genuinely in the future.
  const isLive = Number.isFinite(diff) && diff > 0;

  // Before hydration (now === null) we can't know if the date is future or past, so render the neutral status to
  // avoid a hydration mismatch and a countdown flash. Both sides stay on one line: the strip's height never changes
  // (uniform card heights keep the virtualized grid jump-free).
  if (!isLive) return <StatusValue status={status} labelAs={Label} />;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <>
      <Label>Време до търга</Label>
      <b className={days === 0 ? "is-soon" : undefined}>
        {days > 0 ? (
          <>
            <i>{days}</i>д{" "}
          </>
        ) : null}
        <i>{hours}</i>ч <i>{minutes}</i>м <i>{seconds}</i>с
      </b>
    </>
  );
}
