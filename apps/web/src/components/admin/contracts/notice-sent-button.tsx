"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markNoticeSent } from "@/mutations/contracts";

/**
 * „Отбележи като изпратено" — clears one payment notice from the „за изпращане"
 * list (owner, 26.10.2026). Worded as an ACTION, like „Отбележи като платено":
 * the first label, „✓ Изпратено на клиента", read as a status and got clicked
 * as one. Used on the register's list and on the stage card; rendered only for
 * `notices.markSent`, and the mutation re-checks regardless.
 */
export function NoticeSentButton({ documentId }: { documentId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const result = await markNoticeSent(documentId);
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
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className="rounded-full border border-emerald-600 px-3 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
      >
        {busy ? "Запазване…" : "Отбележи като изпратено"}
      </button>
      {error ? <span className="text-xs font-semibold text-[#b3261e]">{error}</span> : null}
    </span>
  );
}
