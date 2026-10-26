"use client";

import { ADMIN_INPUT, AdminBanner, AdminButton } from "@/components/admin/ui";
import { sendReply } from "@/mutations/mail";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

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
  const fieldId = useId();
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
      // A call that never reaches the server (a dropped connection) rejects; inside a
      // transition that used to reach the page's error boundary.
      let res: Awaited<ReturnType<typeof sendReply>>;
      try {
        res = await sendReply({ threadId, body: trimmed });
      } catch {
        // The text stays in the box; the reply may still have gone out.
        setError(
          "Връзката прекъсна, докато отговорът се изпращаше. Проверете дали се появи в разговора, преди да изпратите отново.",
        );
        return;
      }
      if (!res.success) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={fieldId} className="font-bold text-ink">
          Отговор
        </label>
        <p className="text-xs wrap-anywhere text-muted">
          До <span className="font-semibold text-ink">{to}</span> · от info@selectauto.bg
        </p>
      </div>

      <textarea
        id={fieldId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        disabled={pending}
        placeholder="Напишете отговора си…"
        className={`${ADMIN_INPUT} min-h-40 resize-y`}
      />

      {error && (
        <AdminBanner tone="error" className="mt-2">
          {error}
        </AdminBanner>
      )}

      <div className="mt-3 flex justify-end">
        <AdminButton variant="primary" size="lg" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? "Изпраща се…" : "Изпрати"}
        </AdminButton>
      </div>
    </div>
  );
}
