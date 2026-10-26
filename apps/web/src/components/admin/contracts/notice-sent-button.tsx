"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton } from "@/components/admin/ui";
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
      <AdminButton variant="positive" disabled={busy} onClick={() => void onClick()}>
        {busy ? "Запазване…" : "Отбележи като изпратено"}
      </AdminButton>
      {error ? (
        <span role="alert" className="text-xs font-semibold text-[#b3261e]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
