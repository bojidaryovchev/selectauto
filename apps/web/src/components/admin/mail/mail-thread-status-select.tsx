"use client";

import { Combobox } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import { MAIL_THREAD_STATUSES, MAIL_THREAD_STATUS_META, type MailThreadStatus } from "@/constants/mail";
import { updateThreadStatus } from "@/mutations/mail";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Thread status dropdown („Статус", the kit's dropdown; board `ad-thread-states`). Mirrors the lead inbox's
 * `StatusSelect`: shows the chosen value immediately, locked while it saves, reverts on failure with the message under
 * it, refreshes on success.
 */
export function MailThreadStatusSelect({ threadId, value }: { threadId: number; value: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: MailThreadStatus) {
    const prev = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      // A call that never reaches the server (a dropped connection) rejects; inside a
      // transition that used to reach the page's error boundary.
      let res: Awaited<ReturnType<typeof updateThreadStatus>>;
      try {
        res = await updateThreadStatus(threadId, next);
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
      router.refresh();
    });
  }

  return (
    <div className="ad-stsel">
      <span className="sa-lbl">Статус</span>
      <Combobox
        look="kit"
        aria-label="Статус на разговора"
        options={MAIL_THREAD_STATUSES.map((s) => ({
          value: s,
          label: MAIL_THREAD_STATUS_META[s].label,
        }))}
        value={current}
        onValueChange={(v) => change(v as MailThreadStatus)}
        disabled={pending}
      />
      {error && (
        <p role="alert" className="sa-err">
          <AlertIcon />
          {error}
        </p>
      )}
    </div>
  );
}
