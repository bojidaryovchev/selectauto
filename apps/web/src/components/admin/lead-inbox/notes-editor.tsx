"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateLead } from "@/mutations/admin";
import type { LeadType } from "@/constants/admin";

/**
 * Free-text follow-up notes for a lead. Textarea + save button; saves via
 * `updateLead` and refreshes. Dirty-tracked (save disabled until changed).
 */
export function NotesEditor({
  type,
  id,
  value,
}: {
  type: LeadType;
  id: number;
  value: string | null;
}) {
  const router = useRouter();
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
      <label className="text-xs font-bold uppercase tracking-wide text-muted">Бележки</label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOk(false);
        }}
        rows={4}
        placeholder="Добавете бележки за проследяване на този контакт…"
        className="w-full resize-y rounded-lg border border-line bg-white p-3 text-sm text-ink outline-none focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="h-9 rounded-full bg-ink px-4 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Запазване…" : "Запази бележки"}
        </button>
        {ok && !dirty && <span className="text-xs font-semibold text-emerald-600">Запазено</span>}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
