"use client";

import { LeadStatusBadge } from "@/components/admin/lead-status-badge";
import { Button } from "@/components/common";
import { buttonClasses } from "@/components/common/button-variants";
import { CloseIcon } from "@/components/icons";
import { LEAD_TYPE_META } from "@/constants/admin";
import type { AdminDetailField, AdminLeadView } from "@/types/admin.type";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Drawer } from "@base-ui/react/drawer";
import { useState } from "react";
import { LeadValue } from "./lead-value";
import { NotesEditor } from "./notes-editor";
import { StatusSelect } from "./status-select";

/**
 * Right-hand slide-over showing a single lead in full (boards `ad-carfax-drawer`, `ad-inquiries-drawer`,
 * `ad-offers-drawer`, `ad-carfax-phone`): what the person sent, an offer's amounts, the page, IP and times, the status
 * control, and the notes editor. A Base UI Drawer, so it is a real dialog: focus moves in and is trapped, Escape and
 * the backdrop close it, the page behind doesn't scroll, and on a phone it swipes away to the right. Full width on a
 * phone, 32rem from there. Portaled, so nothing in the admin shell can trap its fixed positioning. The lead data
 * comes pre-formatted from the server mapper (lib/admin-lead-view) — this is presentation only.
 *
 * Unsaved notes are never thrown away silently: a status change no longer
 * closes the drawer (it used to, and took the half-written note with it), and
 * any way of closing it — ✕, Escape, the backdrop, a swipe — first asks while
 * the note is unsaved (Base UI's close confirmation: the close is cancelled in
 * onOpenChange and a nested alert dialog asks; board `ad-inquiries-notes` 5).
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
        <Drawer.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(0.74*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex justify-end">
          <Drawer.Popup className="bo-dw relative -mr-(--bleed) h-full w-[calc(min(100vw,32rem)+var(--bleed))] transform-[translateX(var(--drawer-swipe-movement-x))] touch-auto pr-(--bleed) transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none [--bleed:3rem] data-ending-style:transform-[translateX(calc(100%-var(--bleed)+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-[translateX(calc(100%-var(--bleed)+2px))] data-swiping:select-none supports-[-webkit-touch-callout:none]:[--bleed:0px] motion-reduce:transition-none">
            {lead ? (
              <Drawer.Content key={`${lead.type}-${lead.id}`} className="flex min-h-0 flex-1 flex-col">
                <header className="bo-dw__h">
                  <div>
                    <p className="bo-dw__eb">
                      {LEAD_TYPE_META[lead.type].short} · #{lead.id}
                    </p>
                    <Drawer.Title className="bo-dw__t">{lead.cells[0].text}</Drawer.Title>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                  <Drawer.Close aria-label="Затворете" className="sa-ib sa-ib--ghost">
                    <CloseIcon />
                  </Drawer.Close>
                </header>

                <div className="bo-dw__b overscroll-contain">
                  <FieldList fields={lead.details} />
                  {lead.amounts.length > 0 ? <FieldList fields={lead.amounts} amounts /> : null}
                  <FieldList fields={lead.meta} />

                  <div className="bo-box">
                    <p>Статус</p>
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
          {/* Nested in the drawer, so Base UI leaves its backdrop out unless forced; the board dims the drawer too. */}
          <AlertDialog.Backdrop
            forceRender
            className="sa-scrim fixed z-70 min-h-dvh transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute"
          />
          <AlertDialog.Popup className="sa-dlg bo-dlg fixed top-1/2 left-1/2 z-70 max-w-[calc(100vw-2rem)] -translate-1/2 transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="sa-dlg__h">
              <AlertDialog.Title className="sa-dlg__t">Бележката не е запазена</AlertDialog.Title>
            </div>
            <div className="sa-dlg__b">
              <AlertDialog.Description className="text-[15px]/relaxed text-tx2">
                Ако затворите, написаното ще се загуби.
              </AlertDialog.Description>
            </div>
            <div className="sa-dlg__f">
              <AlertDialog.Close className={buttonClasses({ variant: "sec", size: "md" })}>Върнете се</AlertDialog.Close>
              <Button
                type="button"
                variant="neg"
                size="md"
                onClick={() => {
                  setConfirmDiscard(false);
                  setNotesDirty(false);
                  onOpenChange(false);
                }}
              >
                Затворете без запазване
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Drawer.Root>
  );
}

/** One of the drawer's lists (`bo-dl`); `amounts` right-aligns the values and sets the total larger. */
function FieldList({ fields, amounts = false }: { fields: AdminDetailField[]; amounts?: boolean }) {
  return (
    <dl className={amounts ? "bo-dl bo-dl--num" : "bo-dl"}>
      {fields.map((f, i) => (
        <DetailRow key={i} field={f} amount={amounts} />
      ))}
    </dl>
  );
}

/** Label and value; the value column may shrink, so a long URL wraps instead of pushing it sideways. */
function DetailRow({ field, amount }: { field: AdminDetailField; amount: boolean }) {
  const cls = [field.mono ? "sa-mono" : "", amount ? "is-num" : "", field.big ? "is-big" : ""].filter(Boolean).join(" ");
  return (
    <div>
      <dt>{field.label}</dt>
      <dd className={cls || undefined}>
        {field.href ? (
          <a
            href={field.href}
            target={field.href.startsWith("http") ? "_blank" : undefined}
            rel={field.href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {field.value}
          </a>
        ) : (
          <LeadValue text={field.value} make={field.make} market={field.market} />
        )}
      </dd>
    </div>
  );
}
