"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Combobox } from "@/components/common";
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
      <Combobox
        options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_META[s].label }))}
        value={current}
        onValueChange={(v) => change(v as LeadStatus)}
        disabled={pending}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
