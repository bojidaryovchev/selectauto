"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendReply } from "@/mutations/mail";

/**
 * „Отговори" composer. Sends as info@selectauto.bg with the thread's
 * In-Reply-To/References headers so the reply lands in the customer's existing
 * conversation.
 *
 * Failure is surfaced LOUDLY and the text is kept in the box. Unlike the app's
 * notification emails — which are best-effort by design because the underlying
 * row is already saved — a failed human reply that looked successful means a
 * customer is simply never answered.
 */
export function ReplyComposer({ threadId, to }: { threadId: number; to: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Съобщението не може да е празно.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await sendReply({ threadId, body: trimmed });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold text-ink">Отговор</h2>
        <p className="text-xs text-muted">
          До <span className="font-semibold text-ink">{to}</span> · от info@selectauto.bg
        </p>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        disabled={pending}
        placeholder="Напишете отговора си…"
        className="w-full resize-y rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
      />

      {error && (
        <p className="mt-2 rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">{error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="h-10 rounded-full bg-brand px-5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
        >
          {pending ? "Изпраща се…" : "Изпрати"}
        </button>
      </div>
    </div>
  );
}
