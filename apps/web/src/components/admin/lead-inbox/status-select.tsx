"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateLead } from "@/mutations/admin";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus, type LeadType } from "@/constants/admin";

/**
 * Dropdown that changes a lead's status via the `updateLead` action, then
 * refreshes the route so the table + dashboard counts re-render. Optimistic-ish:
 * shows the chosen value immediately, reverts on failure.
 */
export function StatusSelect({
  type,
  id,
  value,
  onChanged,
}: {
  type: LeadType;
  id: number;
  value: LeadStatus;
  onChanged?: (next: LeadStatus) => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<LeadStatus>(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: LeadStatus) {
    const prev = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const res = await updateLead({ type, id, status: next });
      if (!res.success) {
        setCurrent(prev);
        setError(res.error);
        return;
      }
      onChanged?.(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={current}
        disabled={pending}
        onChange={(e) => change(e.target.value as LeadStatus)}
        className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-brand disabled:opacity-60"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_META[s].label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
