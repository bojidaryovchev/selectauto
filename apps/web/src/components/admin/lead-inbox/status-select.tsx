"use client";

import { Combobox } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus, type LeadType } from "@/constants/admin";
import { updateLead } from "@/mutations/admin";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Dropdown that changes a lead's status via the `updateLead` action, then refreshes the route so the table +
 * dashboard counts re-render (the kit's dropdown; board `ad-inquiries-status`). Optimistic-ish: shows the chosen value
 * immediately, locked while it saves, and reverts on failure with the message under it.
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
      // A call that never reaches the server (a dropped connection) rejects; inside a
      // transition that used to reach the page's error boundary.
      let res: Awaited<ReturnType<typeof updateLead>>;
      try {
        res = await updateLead({ type, id, status: next });
      } catch {
        setCurrent(prev);
        setError("Връзката прекъсна — статусът не е сменен.");
        return;
      }
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
    <>
      <Combobox
        look="kit"
        aria-label="Статус на заявката"
        options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_META[s].label }))}
        value={current}
        onValueChange={(v) => change(v as LeadStatus)}
        disabled={pending}
      />
      {error && (
        <p role="alert" className="sa-err">
          <AlertIcon />
          {error}
        </p>
      )}
    </>
  );
}
