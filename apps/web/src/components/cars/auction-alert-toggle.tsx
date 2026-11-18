"use client";

import { useState, useTransition } from "react";
import { AlertIcon, BellIcon } from "@/components/icons";
import { setAuctionAlertPreference } from "@/mutations/favorites";

/**
 * Opt-in switch on /lyubimi for the daily "любими автомобили с търг днес" email digest (boards `ac-fav`, `ac-fav-st`
 * 2–5; parity check docs/design/parity/lyubimi.md). Rendered only in the signed-in branch of the page; the initial
 * state is read server-side (`getAuctionAlertPreference`) and passed as `initialEnabled`.
 *
 * The flip is optimistic: the switch turns at once, the `setAuctionAlertPreference` action is called, and a failure
 * rolls it back with a message under the description. While saving, the switch waits, dimmed. The digest itself is
 * sent by the Vercel cron (api/cron/favorite-auction-alerts), which emails each opted-in user the favourites whose
 * auction is that day.
 */
export function AuctionAlertToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setError(false);
    startTransition(async () => {
      const result = await setAuctionAlertPreference(next);
      if (result.success) {
        setEnabled(result.data.enabled);
      } else {
        setEnabled(!next); // roll back
        setError(true);
      }
    });
  };

  return (
    <div className="ac-tglw">
      <div className={`ac-tgl ${enabled ? "is-on" : ""}`}>
        <span className="ac-tgl__ic" aria-hidden="true">
          <BellIcon />
        </span>
        <div className="ac-tgl__tx">
          <p className="ac-tgl__t">Известия за търгове днес</p>
          <p className="ac-tgl__d">Получавайте имейл с любимите си автомобили, чийто търг е днес.</p>
          {error ? (
            <p className="sa-err mt-1.5" role="alert">
              <AlertIcon />
              Възникна грешка. Моля, опитайте отново.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Известия за търгове днес по имейл"
          aria-busy={isPending || undefined}
          disabled={isPending}
          onClick={toggle}
          className={`sa-sw ac-swb ${enabled ? "is-on" : ""} ${isPending ? "ac-busy" : ""}`}
        >
          <span className="sa-sw__t" />
        </button>
      </div>
    </div>
  );
}
