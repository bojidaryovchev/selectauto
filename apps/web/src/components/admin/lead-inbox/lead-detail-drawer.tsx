"use client";

import { LeadStatusBadge } from "@/components/admin/lead-status-badge";
import { adminButtonClass } from "@/components/admin/ui";
import { CloseIcon } from "@/components/icons";
import { LEAD_TYPE_META } from "@/constants/admin";
import type { AdminDetailField, AdminLeadView } from "@/types/admin.type";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Drawer } from "@base-ui/react/drawer";
import { useState } from "react";
import { NotesEditor } from "./notes-editor";
import { StatusSelect } from "./status-select";

/**
 * Right-hand slide-over showing a single lead in full: every submitted field
 * (`details`), the status control, and the notes editor. A Base UI Drawer, so
 * it is a real dialog: focus moves in and is trapped, Escape and the backdrop
 * close it, the page behind doesn't scroll, and on a phone it swipes away to
 * the right. Full width on a phone, 32rem from there. Portaled, so nothing in
 * the admin shell can trap its fixed positioning. The lead data comes
 * pre-formatted from the server mapper (lib/admin-lead-view) — this is
 * presentation only.
 *
 * Unsaved notes are never thrown away silently: a status change no longer
 * closes the drawer (it used to, and took the half-written note with it), and
 * any way of closing it — ✕, Escape, the backdrop, a swipe — first asks while
 * the note is unsaved (Base UI's close confirmation: the close is cancelled in
 * onOpenChange and a nested alert dialog asks).
 */
export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
  onOpenChangeComplete,
  onStatusChanged,
}: {
  /** The lead shown; kept while the drawer animates out. */
  lead: AdminLeadView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** The status was changed from the drawer (it stays open). */
  onStatusChanged?: (status: AdminLeadView["status"]) => void;
}) {
  const [notesDirty, setNotesDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next, eventDetails) => {
        if (!next && notesDirty) {
          eventDetails.cancel();
          setConfirmDiscard(true);
          return;
        }
        onOpenChange(next);
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setNotesDirty(false);
        onOpenChangeComplete?.(isOpen);
      }}
      swipeDirection="right"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(0.4*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex justify-end">
          <Drawer.Popup className="-mr-(--bleed) flex h-full w-[calc(min(100vw,32rem)+var(--bleed))] transform-[translateX(var(--drawer-swipe-movement-x))] touch-auto flex-col bg-white pr-(--bleed) shadow-2xl transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none [--bleed:3rem] data-ending-style:transform-[translateX(calc(100%-var(--bleed)+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-[translateX(calc(100%-var(--bleed)+2px))] data-swiping:select-none supports-[-webkit-touch-callout:none]:[--bleed:0px] motion-reduce:transition-none">
            {lead ? (
              <Drawer.Content key={`${lead.type}-${lead.id}`} className="flex min-h-0 flex-1 flex-col">
                <header className="flex items-center gap-3 border-b border-line p-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold tracking-wide text-muted uppercase">
                      {LEAD_TYPE_META[lead.type].short} · #{lead.id}
                    </p>
                    <Drawer.Title className="text-lg font-black wrap-anywhere text-ink">{lead.cells[0]}</Drawer.Title>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                  <Drawer.Close
                    aria-label="Затвори"
                    className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-neutral-100 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                  >
                    <CloseIcon className="size-5" />
                  </Drawer.Close>
                </header>

                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                  <dl className="m-0 divide-y divide-line">
                    {lead.details.map((f, i) => (
                      <DetailRow key={i} field={f} />
                    ))}
                  </dl>

                  <div className="rounded-xl border border-line bg-[#fafafa] p-4">
                    <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Статус</p>
                    <StatusSelect type={lead.type} id={lead.id} value={lead.status} onChanged={onStatusChanged} />
                  </div>

                  <NotesEditor type={lead.type} id={lead.id} value={lead.adminNotes} onDirtyChange={setNotesDirty} />
                </div>
              </Drawer.Content>
            ) : null}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>

      <AlertDialog.Root open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-70 min-h-dvh bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-70 flex w-96 max-w-[calc(100vw-2rem)] -translate-1/2 flex-col gap-4 rounded-2xl bg-white p-5 shadow-2xl transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="flex flex-col gap-1">
              <AlertDialog.Title className="text-base font-black text-ink">Бележката не е запазена</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted">
                Ако затворите, написаното ще се загуби.
              </AlertDialog.Description>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <AlertDialog.Close className={adminButtonClass("secondary")}>Върни се</AlertDialog.Close>
              <button
                type="button"
                className={adminButtonClass("danger")}
                onClick={() => {
                  setConfirmDiscard(false);
                  setNotesDirty(false);
                  onOpenChange(false);
                }}
              >
                Затвори без запазване
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Drawer.Root>
  );
}

/** Label and value; the value column may shrink, so a long URL wraps instead of pushing it sideways. */
function DetailRow({ field }: { field: AdminDetailField }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-sm font-semibold text-muted">{field.label}</dt>
      <dd className={`m-0 text-sm wrap-anywhere text-ink ${field.mono ? "font-mono" : ""}`}>
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
