"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/common";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { markNoticeSent } from "@/mutations/contracts";

/**
 * „Отбележете като изпратено" — clears one payment notice from the „за изпращане" list (owner, 26.10.2026). Worded
 * as an ACTION, like „Отбележете като платено": the first label, „✓ Изпратено на клиента", read as a status and got
 * clicked as one. A secondary button with a green tick (board `ab-contracts-sup`); its error on a line of its own
 * (`ab-send__err`, board `ab-contracts-states`). Used on the register's list and on the stage card; rendered only for
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
    <>
      <Button variant="sec" size="md" className="ab-btn-pos" disabled={busy} busy={busy} onClick={() => void onClick()}>
        {busy ? null : <CheckIcon />}
        {busy ? "Запазване…" : "Отбележете като изпратено"}
      </Button>
      {error ? (
        <p className="ab-send__err">
          <span role="alert" className="sa-err">
            <AlertIcon />
            {error}
          </span>
        </p>
      ) : null}
    </>
  );
}
