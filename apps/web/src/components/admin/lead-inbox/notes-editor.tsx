"use client";

import { Button } from "@/components/common";
import { AlertIcon, CheckIcon } from "@/components/icons";
import type { LeadType } from "@/constants/admin";
import { updateLead } from "@/mutations/admin";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * Free-text follow-up notes for a lead (`bo-notes`; board `ad-inquiries-notes`). Textarea + save button; saves via
 * `updateLead` and refreshes. Dirty-tracked (save disabled until changed), and the dirty flag is reported up so the
 * drawer can ask before closing.
 */
export function NotesEditor({
  type,
  id,
  value,
  onDirtyChange,
}: {
  type: LeadType;
  id: number;
  value: string | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState(value ?? "");
  const [saved, setSaved] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = text !== saved;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function save() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      // A call that never reaches the server (a dropped connection) rejects; inside a
      // transition that used to reach the page's error boundary.
      let res: Awaited<ReturnType<typeof updateLead>>;
      try {
        res = await updateLead({ type, id, notes: text });
      } catch {
        setError("Връзката прекъсна — бележките не са запазени.");
        return;
      }
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
    <div className="bo-notes">
      <label className="bo-notes__l">
        <span className="sa-lbl">Бележки</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOk(false);
          }}
          rows={4}
          placeholder="Добавете бележки за проследяване на този контакт…"
          className="sa-in w-full"
        />
      </label>
      <div className="bo-notes__f">
        <Button variant="pri" size="md" onClick={save} disabled={!dirty || pending} busy={pending}>
          {pending ? "Запазване…" : "Запазете бележки"}
        </Button>
        {ok && !dirty && (
          <span role="status" className="bo-ok">
            <CheckIcon />
            Запазено
          </span>
        )}
        {error && (
          <span role="alert" className="sa-err">
            <AlertIcon />
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
