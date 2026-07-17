"use client";

import { useEffect } from "react";
import { LEAD_TYPE_META } from "@/constants/admin";
import type { AdminDetailField, AdminLeadView } from "@/types/admin.type";
import { LeadStatusBadge } from "@/components/admin/lead-status-badge";
import { NotesEditor } from "./notes-editor";
import { StatusSelect } from "./status-select";

/**
 * Right-hand slide-over showing a single lead in full: every submitted field
 * (`details`), the status control, and the notes editor. Closes on backdrop
 * click or Escape. The lead data comes pre-formatted from the server mapper
 * (lib/admin-lead-view) — this is presentation only.
 */
export function LeadDetailDrawer({
  lead,
  onClose,
}: {
  lead: AdminLeadView;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Затвори"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="relative flex size-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-line p-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {LEAD_TYPE_META[lead.type].short} · #{lead.id}
            </p>
            <p className="wrap-break-word text-lg font-black text-ink">{lead.cells[0]}</p>
          </div>
          <LeadStatusBadge status={lead.status} />
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <dl className="divide-y divide-line">
            {lead.details.map((f, i) => (
              <DetailRow key={i} field={f} />
            ))}
          </dl>

          <div className="rounded-xl border border-line bg-[#fafafa] p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted">
              Статус
            </label>
            <StatusSelect type={lead.type} id={lead.id} value={lead.status} onChanged={onClose} />
          </div>

          <NotesEditor type={lead.type} id={lead.id} value={lead.adminNotes} />
        </div>
      </aside>
    </div>
  );
}

function DetailRow({ field }: { field: AdminDetailField }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2.5 sm:grid-cols-[9rem_1fr]">
      <dt className="text-sm font-semibold text-muted">{field.label}</dt>
      <dd className={`text-sm text-ink ${field.mono ? "font-mono" : ""} wrap-break-word`}>
        {field.href ? (
          <a
            href={field.href}
            target={field.href.startsWith("http") ? "_blank" : undefined}
            rel={field.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-brand underline underline-offset-2 hover:text-brand-dark"
          >
            {field.value}
          </a>
        ) : (
          field.value
        )}
      </dd>
    </div>
  );
}
