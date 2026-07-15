"use client";

import { useState, useTransition } from "react";
import { BellIcon } from "@/components/icons";
import { setAuctionAlertPreference } from "@/mutations/favorites";

/**
 * Opt-in switch on /lyubimi for the daily "любими автомобили с търг днес" email
 * digest. Rendered only in the signed-in branch of the page; the initial state
 * is read server-side (`getAuctionAlertPreference`) and passed as `initialEnabled`.
 *
 * The flip is optimistic: we set the switch immediately, call the
 * `setAuctionAlertPreference` action, and roll back if it fails. A short status
 * line under the row confirms the new state (or an error). The digest itself is
 * sent by the Vercel cron (api/cron/favorite-auction-alerts), which emails each
 * opted-in user the favourites whose auction is that day.
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
    <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4 shadow-card">
      <span
        aria-hidden="true"
        className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors ${
          enabled ? "bg-brand/10 text-brand" : "bg-[#f4f4f5] text-muted"
        }`}
      >
        <BellIcon className="size-5.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink-strong">Известия за търгове днес</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          Получавайте имейл с любимите си автомобили, чийто търг е днес.
        </p>
        {error ? (
          <p className="mt-1 text-[13px] font-medium text-brand-dark">
            Възникна грешка. Моля опитайте отново.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Известия за търгове днес по имейл"
        disabled={isPending}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60 ${
          enabled ? "bg-brand" : "bg-[#d4d4d8]"
        }`}
      >
        <span
          className={`inline-block size-5.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
