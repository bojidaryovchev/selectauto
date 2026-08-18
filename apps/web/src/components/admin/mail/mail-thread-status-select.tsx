"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Combobox } from "@/components/common";
import { updateThreadStatus } from "@/mutations/mail";
import { MAIL_THREAD_STATUSES, MAIL_THREAD_STATUS_META, type MailThreadStatus } from "@/constants/mail";

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
      const res = await updateThreadStatus(threadId, next);
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
