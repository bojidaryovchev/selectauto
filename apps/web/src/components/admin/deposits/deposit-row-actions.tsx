"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEPOSIT_STATUS_META, DEPOSIT_STATUSES, type DepositStatus } from "@/constants/contracts";
import { updateDepositStatus } from "@/mutations/deposits";

/**
 * Status changer for one deposit row (spec §14). 'used' is missing from the
 * options on purpose — only contract creation sets it (automatic deduction);
 * a used deposit shows read-only.
 */
export function DepositRowActions({ depositId, status }: { depositId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "used") {
    return <span className="text-xs text-muted">—</span>;
  }

  async function onChange(next: string) {
    if (next === status) return;
    setBusy(true);
    setError(null);
    try {
      const result = await updateDepositStatus(depositId, next);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Грешка при запис.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        disabled={busy}
        onChange={(e) => void onChange(e.target.value)}
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none focus:border-brand disabled:opacity-60"
      >
        {DEPOSIT_STATUSES.filter((s) => s !== "used").map((s) => (
          <option key={s} value={s}>
            {DEPOSIT_STATUS_META[s as DepositStatus].label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs font-semibold text-[#b3261e]">{error}</span> : null}
    </div>
  );
}
