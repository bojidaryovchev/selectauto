"use client";

import { Combobox } from "@/components/common";
import { MAIL_THREAD_STATUSES, MAIL_THREAD_STATUS_META, type MailThreadStatus } from "@/constants/mail";
import { updateThreadStatus } from "@/mutations/mail";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Thread status dropdown. Mirrors the lead inbox's `StatusSelect`: shows the
 * chosen value immediately, reverts on failure, refreshes on success.
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
    <div className="flex flex-col gap-1">
      <Combobox
        aria-label="Статус на разговора"
        options={MAIL_THREAD_STATUSES.map((s) => ({
          value: s,
          label: MAIL_THREAD_STATUS_META[s].label,
        }))}
        value={current}
        onValueChange={(v) => change(v as MailThreadStatus)}
        disabled={pending}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
