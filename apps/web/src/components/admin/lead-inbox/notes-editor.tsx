"use client";

import { ADMIN_INPUT, AdminButton } from "@/components/admin/ui";
import type { LeadType } from "@/constants/admin";
import { updateLead } from "@/mutations/admin";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

/**
 * Free-text follow-up notes for a lead. Textarea + save button; saves via
 * `updateLead` and refreshes. Dirty-tracked (save disabled until changed).
 */
export function NotesEditor({ type, id, value }: { type: LeadType; id: number; value: string | null }) {
  const router = useRouter();
  const fieldId = useId();
  const [text, setText] = useState(value ?? "");
  const [saved, setSaved] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = text !== saved;

  function save() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await updateLead({ type, id, notes: text });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSaved(text);
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-xs font-bold tracking-wide text-muted uppercase">
        Бележки
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOk(false);
        }}
        rows={4}
        placeholder="Добавете бележки за проследяване на този контакт…"
        className={`${ADMIN_INPUT} min-h-28 resize-y`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <AdminButton variant="primary" onClick={save} disabled={!dirty || pending}>
          {pending ? "Запазване…" : "Запази бележки"}
        </AdminButton>
        {ok && !dirty && (
          <span role="status" className="text-xs font-semibold text-emerald-600">
            Запазено
          </span>
        )}
        {error && (
          <span role="alert" className="text-xs text-rose-600">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
