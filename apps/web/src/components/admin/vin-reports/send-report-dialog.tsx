"use client";

import { AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { buttonClasses } from "@/components/common/button-variants";
import { PaperclipIcon } from "@/components/icons";
import { CONTACT } from "@/constants";
import {
  defaultVinReportEmailBody,
  VIN_REPORT_EMAIL_MAX_LENGTH,
  vinReportEmailSubject,
  vinReportPdfFilename,
} from "@/lib/vin-report-email";
import { sendVinReportToClient, type SendVinReportResult } from "@/mutations/vin-reports";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useId, useState, useTransition } from "react";

/**
 * „Изпратете на клиента": the e-mail that sends a report's PDF to a Carfax lead's client, shown before it goes — who
 * it goes to and from, the subject, the attachment — with its text prefilled and editable (staff speak for the
 * business, as in a Поща reply). The subject is fixed: it is what files the client's answer into the conversation.
 *
 * A Base UI alert dialog, as the lead drawer's own (it nests inside the drawer): focus is trapped, and it can't be
 * closed while sending. A failed send keeps the text and says what happened; a dropped connection says to check Поща
 * before sending again, since the e-mail may have gone.
 */
export function SendReportDialog({
  open,
  onOpenChange,
  report,
  lead,
  vehicle,
  sentBefore,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: { id: number; providerLabel: string; vin: string };
  lead: { id: number; name: string; email: string };
  /** For the default text: AuctionsAPI's vehicle name, or the lead's make and model. */
  vehicle: string | null;
  /** When this report was already e-mailed to this lead („24.11.2026 г., 14:05"). */
  sentBefore: string | null;
  onSent: (result: SendVinReportResult) => void;
}) {
  const uid = useId();
  const [body, setBody] = useState(() =>
    defaultVinReportEmailBody({
      name: lead.name,
      providerLabel: report.providerLabel,
      vin: report.vin,
      vehicle,
      phone: CONTACT.phone,
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const text = body.trim();
    if (!text) {
      setError("Писмото не може да е празно.");
      return;
    }
    setError(null);
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof sendVinReportToClient>>;
      try {
        res = await sendVinReportToClient({ reportId: report.id, leadId: lead.id, body: text });
      } catch {
        setError(
          "Връзката прекъсна, докато писмото се изпращаше. Проверете разговора в Поща, преди да изпратите отново.",
        );
        return;
      }
      if (!res.success) {
        setError(res.error);
        return;
      }
      onSent(res.data);
    });
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        {/* Nested in the lead drawer, Base UI leaves its backdrop out unless forced (the drawer's own dialog does the same). */}
        <AlertDialog.Backdrop
          forceRender
          className="sa-scrim fixed z-70 min-h-dvh transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute"
        />
        <AlertDialog.Popup className="sa-dlg sa-dlg--lg fixed top-1/2 left-1/2 z-70 max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] -translate-1/2 transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <div className="sa-dlg__h">
            <AlertDialog.Title className="sa-dlg__t">Изпращане на отчета на клиента</AlertDialog.Title>
          </div>
          <div className="sa-dlg__b">
            <AlertDialog.Description className="ab-dlg-note">
              До <b className="text-tx">{lead.email}</b> ({lead.name}) · от {CONTACT.email}. Писмото се записва в Поща и
              отговорът на клиента пристига там.
            </AlertDialog.Description>
            {/* Stacked, not a label column: on a phone the column left the file name ~200 px and broke it mid-word. */}
            <div className="flex flex-col items-start gap-2 text-sm">
              <p>
                <span className="text-tx3">Тема: </span>
                <span className="text-tx">{vinReportEmailSubject(report.providerLabel, report.vin)}</span>
              </p>
              <span className="bo-file">
                <PaperclipIcon />
                <span>
                  <span className="sr-only">Прикачен файл: </span>
                  {vinReportPdfFilename(report.providerLabel, report.vin)}
                </span>
              </span>
            </div>
            <div className="ab-fld">
              <label htmlFor={`${uid}-body`} className="sa-lbl">
                Текст на писмото
              </label>
              <textarea
                id={`${uid}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                maxLength={VIN_REPORT_EMAIL_MAX_LENGTH}
                disabled={pending}
                className="sa-in w-full"
              />
            </div>
            {sentBefore ? (
              <AdminBanner tone="warning" className="ab-al">
                Този отчет вече е изпратен на клиента на {sentBefore}. Ще получи второ писмо.
              </AdminBanner>
            ) : null}
            {error ? (
              <AdminBanner tone="error" className="ab-al">
                {error}
              </AdminBanner>
            ) : null}
          </div>
          <div className="sa-dlg__f">
            <AlertDialog.Close className={buttonClasses({ variant: "sec", size: "md" })} disabled={pending}>
              Отказ
            </AlertDialog.Close>
            <Button variant="pri" size="md" onClick={send} disabled={pending || !body.trim()} busy={pending}>
              {pending ? "Изпращане…" : "Изпратете"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
