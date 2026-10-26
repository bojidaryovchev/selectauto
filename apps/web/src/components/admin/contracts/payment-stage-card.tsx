"use client";

import { ADMIN_HINT, ADMIN_INPUT, ADMIN_SELECT, AdminBanner, AdminButton } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DEFAULT_PAYMENT_TERM_DAYS,
  MAX_ATTACHMENT_BYTES,
  PAYMENT_STAGE_META,
  STAGE_ALLOWED_RECIPIENT_KINDS,
  stageLabel,
  type ContractMarket,
  type PaymentStage,
} from "@/constants/contracts";
import { dbToCents, formatCents, formatDbAmount } from "@/lib/money";
import { contractLineCents, noticeLineCurrency } from "@/lib/notice";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import {
  addPaymentAttachment,
  generatePaymentNotice,
  markPaymentPaid,
  previewPaymentNotice,
  revertPayment,
} from "@/mutations/contracts";
import type { ContractPaymentWithRecipient, GeneratedDocumentRow, PaymentAttachmentRow } from "@/queries/contracts";
import type { RecipientRow } from "@/queries/recipients";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { NoticeSentButton } from "./notice-sent-button";
import { PaymentStatusBadge } from "./payment-status-badge";

/**
 * One payment-stage card on the contract detail (spec §4): due sum, status,
 * recipient, versions of the generated notice, and the three §4.3/§6 actions —
 * generate a notice (with the §5 recipient rules and the §16 курс field, plus
 * the §6.3 preview step), mark as paid (partial allowed), revert. All rules are
 * re-validated server-side; the UI only *hides* what's invalid.
 */
type Panel = "none" | "generate" | "preview" | "paid";

const LABEL = "text-xs font-semibold text-ink";

const TOO_BIG = "Файлът е по-голям от 4 MB — намалете снимката или изберете по-малък файл.";

// The proof-of-payment picker's own button, sized like the other controls.
const FILE_INPUT =
  "w-full text-xs text-muted file:mr-2 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-neutral-200 file:px-4 file:text-xs file:font-bold file:text-ink";

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

/** Standard payment term from today (mirrors the server-side default). */
function defaultDueDate(): string {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + DEFAULT_PAYMENT_TERM_DAYS);
  return d.toISOString().slice(0, 10);
}

export function PaymentStageCard({
  payment,
  contract,
  recipients,
  documents,
  attachments,
  actions,
}: {
  payment: ContractPaymentWithRecipient;
  contract: {
    id: number;
    number: string;
    market: string;
    currency: string;
    status: string;
    /** Канада „кола + транспорт": the CAD side of Точка 1 (see lib/notice). */
    foreignCurrency: string | null;
    amountCarForeign: string | null;
    /** The deposit taken off Точка 1, "0" when none. */
    depositDeduction: string;
  };
  /** ACTIVE recipients only (the page filters). */
  recipients: RecipientRow[];
  /** Notice versions for THIS payment, newest first. */
  documents: GeneratedDocumentRow[];
  /** Uploaded proof-of-payment files for THIS payment, newest first. */
  attachments: PaymentAttachmentRow[];
  /**
   * What the viewer's capabilities allow here (`notices.generate`,
   * `payments.record`, `payments.attach`, `notices.markSent`). „Наблюдаващ" only
   * attaches; everything else is read-only. The mutations re-check server-side
   * regardless.
   */
  actions: { issueNotices: boolean; recordPayments: boolean; attach: boolean; markSent: boolean };
}) {
  const router = useRouter();
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;
  const stage = payment.stage as PaymentStage;
  const stageMeta = PAYMENT_STAGE_META[stage];
  const heading = stageLabel(contract.market as ContractMarket, stage);

  // §5: only the allowed kinds are ever shown; final = fixed SelectAuto.
  const allowed = useMemo(() => {
    const kinds = STAGE_ALLOWED_RECIPIENT_KINDS[stage] ?? [];
    return recipients.filter((r) => (kinds as readonly string[]).includes(r.kind));
  }, [recipients, stage]);
  const isFinalStage = stage === "final";
  const fixedFinal = isFinalStage ? allowed.find((r) => r.kind === "selectauto") : undefined;

  const [panel, setPanel] = useState<Panel>("none");
  const [recipientId, setRecipientId] = useState<number | undefined>(
    payment.recipientId ?? fixedFinal?.id ?? undefined,
  );
  const [rate, setRate] = useState("");
  const [amountOverride, setAmountOverride] = useState("");
  const [basis, setBasis] = useState(payment.basis ?? "");
  // A regenerated notice must not inherit a падеж that has already passed — the
  // overdue sweep would flip the stage back to „Просрочено" the next morning.
  const [dueDate, setDueDate] = useState(() =>
    payment.dueDate && payment.dueDate >= todayIso() ? payment.dueDate : defaultDueDate(),
  );
  const [preview, setPreview] = useState<NoticeSnapshot | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachOnlyRef = useRef<HTMLInputElement>(null);

  const chosen = allowed.find((r) => r.id === (isFinalStage ? fixedFinal?.id : recipientId));
  const needsRate = contract.market === "us" && chosen?.kind === "selectauto";
  /**
   * Auto America / Lean Customs are always paid in EUR (owner, 07.2026), so on a
   * non-EUR contract the euro sum has to be stated here. The field is offered on
   * every notice though — the contract sums are estimates, and the operator may
   * want to type the real amount instead of relying on the contract figure. It
   * replaces the stage's LINE (the gross Точка 1 when a deposit applies) in the
   * currency the PDF prints that line in; the курс and the deposit still apply.
   */
  const lineCurrency = noticeLineCurrency(contract, stage, chosen?.kind ?? "");
  const depositCents = stage === "vehicle" ? dbToCents(contract.depositDeduction) : 0;
  const lineCents = contractLineCents(contract, payment, depositCents);
  const amountRequired = chosen?.kind === "customs_broker" && contract.currency !== "EUR";
  const remainingCents = dbToCents(payment.dueAmount) - dbToCents(payment.paidAmount);
  const versionCount = documents.length;
  const cancelled = contract.status === "cancelled";
  // „За изпращане" (owner, 26.10.2026): only the newest version can be waiting
  // to go to the client, and only while the stage still expects a payment.
  const toSendId =
    documents[0] &&
    !documents[0].clientSentAt &&
    !cancelled &&
    payment.status !== "paid" &&
    payment.status !== "cancelled"
      ? documents[0].id
      : null;

  function resetPanels() {
    setPanel("none");
    setPreview(null);
    setError(null);
  }

  /** The exact input both the preview and the generation receive. */
  function noticeInput(recipient: RecipientRow) {
    return {
      paymentId: payment.id,
      recipientId: recipient.id,
      usdEurRate: needsRate ? rate : undefined,
      amountOverride: amountOverride.trim() || undefined,
      basis,
      dueDate: dueDate || undefined,
    };
  }

  /** §6.3 — the server builds the snapshot the PDF will print, nothing is written. */
  async function onPreview() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const result = await previewPaymentNotice(noticeInput(chosen));
      if (result.success) {
        setPreview(result.data);
        setPanel("preview");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Възникна грешка. Моля опитайте отново.");
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateConfirm() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generatePaymentNotice(noticeInput(chosen));
      if (result.success) {
        resetPanels();
        router.refresh();
        window.open(`/api/payment-document/${result.data.documentId}`, "_blank");
      } else {
        setError(result.error);
        setPanel("generate");
      }
    } catch {
      setError("Възникна грешка. Моля опитайте отново.");
      setPanel("generate");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    // A file that can't be sent is caught before the payment is recorded, so it
    // can be swapped first.
    const file = fileRef.current?.files?.[0];
    if (file && file.size > MAX_ATTACHMENT_BYTES) {
      setError(TOO_BIG);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await markPaymentPaid({ paymentId: payment.id, paidAmount, paidAt, note });
      if (!result.success) {
        setError(result.error);
        return;
      }

      // Recorded. Close the form at once: payments add up, so a form left open
      // after a failed upload invited a second „Запази плащането" — and recorded
      // the payment twice.
      resetPanels();
      setPaidAmount("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";

      // Attaching the proof is a separate, secondary step: a failed upload
      // reports itself and is repeated with „＋ Прикачи платежен документ".
      if (file) {
        let uploadError: string | null = null;
        try {
          const fd = new FormData();
          fd.set("paymentId", String(payment.id));
          fd.set("file", file);
          const upload = await addPaymentAttachment(fd);
          if (!upload.success) uploadError = upload.error;
        } catch {
          uploadError = "файлът не стигна до сървъра.";
        }
        if (uploadError) {
          setError(
            `Плащането е записано, но файлът не се прикачи: ${uploadError} Прикачете го отново с „＋ Прикачи платежен документ“.`,
          );
        }
      }
      router.refresh();
    } catch {
      setError("Възникна грешка. Моля опитайте отново.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Standalone upload, for every `payments.attach` holder: a „Наблюдаващ"'s one
   * write action (no notices, no statuses), and how anyone adds a proof to a
   * stage that is already paid, or repeats an upload that failed.
   */
  async function onAttachOnly(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(TOO_BIG);
      if (attachOnlyRef.current) attachOnlyRef.current.value = "";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("paymentId", String(payment.id));
      fd.set("file", file);
      const result = await addPaymentAttachment(fd);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Възникна грешка при прикачването.");
    } finally {
      setBusy(false);
      if (attachOnlyRef.current) attachOnlyRef.current.value = "";
    }
  }

  async function onRevert() {
    setBusy(true);
    try {
      const result = await revertPayment(payment.id);
      setRevertOpen(false);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setBusy(false);
    }
  }

  const rateValid = !needsRate || (Number(rate.replace(",", ".")) > 0 && Number(rate.replace(",", ".")) < 100);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-black text-ink">{heading}</h3>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <p className="text-xs text-muted">{stageMeta?.description}</p>
      <div className="mt-1 text-lg font-black text-ink">
        {formatDbAmount(payment.dueAmount)} {payment.currency}
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <div>
          <dt className="inline font-semibold text-muted">Получател: </dt>
          <dd className="inline text-ink">{payment.recipientName ?? "— не е избран —"}</dd>
        </div>
        {payment.basis ? (
          <div>
            <dt className="inline font-semibold text-muted">Основание: </dt>
            <dd className="inline wrap-anywhere text-ink">{payment.basis}</dd>
          </div>
        ) : null}
        {payment.dueDate ? (
          <div>
            <dt className="inline font-semibold text-muted">Падеж: </dt>
            <dd className="inline text-ink">{payment.dueDate}</dd>
          </div>
        ) : null}
        {dbToCents(payment.paidAmount) > 0 ? (
          <>
            <div>
              <dt className="inline font-semibold text-muted">Платено: </dt>
              <dd className="inline font-semibold text-ink">
                {formatDbAmount(payment.paidAmount)} {payment.currency}
                {payment.paidAt ? ` (${payment.paidAt})` : ""}
              </dd>
            </div>
            {remainingCents > 0 ? (
              <div>
                <dt className="inline font-semibold text-muted">Остатък: </dt>
                <dd className="inline font-semibold text-[#b3261e]">
                  {formatCents(remainingCents)} {payment.currency}
                </dd>
              </div>
            ) : null}
          </>
        ) : null}
        {payment.note ? (
          <div>
            <dt className="inline font-semibold text-muted">Бележка: </dt>
            <dd className="inline wrap-anywhere text-ink">{payment.note}</dd>
          </div>
        ) : null}
      </dl>

      {/* Versions */}
      {versionCount > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-2">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Известия</p>
          {documents.map((d) => (
            <div key={d.id} className="flex flex-col gap-1">
              <a
                href={`/api/payment-document/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 items-center text-sm font-semibold text-brand hover:underline"
              >
                Версия {d.version} — {formatSofiaDateTime(d.createdAt)} ⬇
              </a>
              {d.id === toSendId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                    За изпращане към клиента
                  </span>
                  {actions.markSent ? <NoticeSentButton documentId={d.id} /> : null}
                </div>
              ) : d.clientSentAt && d.clientSentBy ? (
                <span className="text-xs text-muted">Изпратено на клиента — {formatSofiaDateTime(d.clientSentAt)}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Прикачени платежни документи (§4.3) */}
      {attachments.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-2">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Прикачени документи</p>
          {attachments.map((a) => (
            <a
              key={a.id}
              href={`/api/payment-attachment/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 items-center text-sm font-semibold break-all text-brand hover:underline"
            >
              {a.filename} ⬇
            </a>
          ))}
        </div>
      ) : null}

      {error && panel !== "generate" ? <AdminBanner tone="error">{error}</AdminBanner> : null}

      {/* ── Generate panel ── */}
      {panel === "generate" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3">
          {isFinalStage ? (
            <p className="text-sm text-ink">
              Получател: <span className="font-bold">{fixedFinal?.name ?? "SelectAuto"}</span> (фиксиран)
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <label htmlFor={fieldId("recipient")} className={LABEL}>
                Получател
              </label>
              <select
                id={fieldId("recipient")}
                value={recipientId ?? ""}
                onChange={(e) => setRecipientId(e.target.value ? Number(e.target.value) : undefined)}
                className={ADMIN_SELECT}
              >
                <option value="">— изберете —</option>
                {allowed.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {needsRate ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={fieldId("rate")} className={LABEL}>
                Курс USD/EUR *
              </label>
              <input
                id={fieldId("rate")}
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="напр. 0.86"
                className={ADMIN_INPUT}
              />
              <p className={ADMIN_HINT}>Евро се изчисляват автоматично — виждате ги в прегледа.</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("amount")} className={LABEL}>
              Сума по етапа ({lineCurrency}){amountRequired ? " *" : " — по избор"}
            </label>
            <input
              id={fieldId("amount")}
              type="text"
              inputMode="decimal"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder={amountRequired ? `сума в ${lineCurrency}` : formatCents(lineCents)}
              className={ADMIN_INPUT}
            />
            <p className={ADMIN_HINT}>
              {amountRequired
                ? `Плащанията към ${chosen?.name} са в евро — въведете реалната сума по фактурата им.`
                : `Празно = сумата от договора (${formatCents(lineCents)} ${lineCurrency}). Попълва се, когато реалната сума се различава.`}
              {depositCents > 0 && !amountRequired
                ? ` Депозитът (−${formatCents(depositCents)} ${contract.currency}) се приспада автоматично — не го вадете от сумата.`
                : ""}
              {needsRate ? " Курсът се прилага и към въведената сума." : ""}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("basis")} className={LABEL}>
              Основание
            </label>
            <input
              id={fieldId("basis")}
              type="text"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("due")} className={LABEL}>
              Падеж (по подразбиране 10 дни)
            </label>
            <input
              id={fieldId("due")}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="primary"
              disabled={busy || !chosen || (needsRate && !rateValid) || (amountRequired && !amountOverride.trim())}
              onClick={() => void onPreview()}
            >
              {busy ? "Изчисляване…" : "Преглед →"}
            </AdminButton>
            <AdminButton variant="ghost" onClick={resetPanels}>
              Отказ
            </AdminButton>
          </div>
        </div>
      ) : null}

      {/* ── Preview (§6.3) + confirm — the snapshot the PDF prints, built on the server ── */}
      {panel === "preview" && chosen && preview ? (
        <div className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3 text-sm">
          <p className="font-bold text-ink">Преглед преди генериране</p>
          <dl className="flex flex-col gap-0.5">
            <div>
              <dt className="inline text-muted">Договор: </dt>
              <dd className="inline font-semibold text-ink">{preview.contractNumber}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Етап: </dt>
              <dd className="inline font-semibold text-ink">{heading}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Получател: </dt>
              <dd className="inline font-semibold text-ink">{preview.recipient.name}</dd>
            </div>
          </dl>
          <ul className="flex flex-col gap-1 rounded-lg bg-white p-2">
            {preview.lines.map((line, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="min-w-0 text-ink">{line.description}</span>
                <span className="font-semibold whitespace-nowrap text-ink">
                  {formatCents(line.amountCents)} {preview.currency}
                  {preview.showRateColumns && preview.usdEurRate !== undefined
                    ? ` × ${preview.usdEurRate} = ${formatCents(line.amountEurCents ?? 0)} EUR`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="font-black text-ink">
            Обща сума за плащане: {formatCents(preview.totalCents)} {preview.totalCurrencyLabel}
          </p>
          <dl className="flex flex-col gap-0.5">
            <div>
              <dt className="inline text-muted">Основание: </dt>
              <dd className="inline font-semibold text-ink">{preview.basis}</dd>
            </div>
          </dl>
          {versionCount > 0 ? (
            <AdminBanner tone="warning">
              Вече има {versionCount} генерирана(и) версия(и) — потвърждението ще създаде версия {versionCount + 1}, без
              да изтрива старите.
            </AdminBanner>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="primary" disabled={busy} onClick={onGenerateConfirm}>
              {busy ? "Генериране…" : "Потвърди и генерирай PDF"}
            </AdminButton>
            <AdminButton
              variant="ghost"
              onClick={() => {
                setPreview(null);
                setPanel("generate");
              }}
            >
              ← Назад
            </AdminButton>
          </div>
        </div>
      ) : null}

      {/* ── Mark-paid panel ── */}
      {panel === "paid" ? (
        <form
          onSubmit={onMarkPaid}
          className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("paid")} className={LABEL}>
              Реално платена сума ({payment.currency})
            </label>
            <input
              id={fieldId("paid")}
              type="text"
              inputMode="decimal"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder={formatCents(remainingCents)}
              className={ADMIN_INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("paid-at")} className={LABEL}>
              Дата на плащане
            </label>
            <input
              id={fieldId("paid-at")}
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId("note")} className={LABEL}>
              Бележка
            </label>
            <input
              id={fieldId("note")}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          {actions.attach ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={fieldId("proof")} className={LABEL}>
                Платежен документ (PDF/снимка, до 4 MB)
              </label>
              <input
                id={fieldId("proof")}
                ref={fileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className={FILE_INPUT}
              />
            </div>
          ) : null}
          {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
          <div className="flex flex-wrap gap-2">
            <AdminButton type="submit" variant="success" disabled={busy}>
              {busy ? "Запазване…" : "Запази плащането"}
            </AdminButton>
            <AdminButton variant="ghost" onClick={resetPanels}>
              Отказ
            </AdminButton>
          </div>
        </form>
      ) : null}

      {/* ── Actions ── */}
      {panel === "none" && !cancelled && (actions.issueNotices || actions.recordPayments) ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {actions.issueNotices ? (
            <AdminButton
              variant="primary"
              onClick={() => {
                setPanel("generate");
                setError(null);
              }}
            >
              Генерирай известие
            </AdminButton>
          ) : null}
          {actions.recordPayments && payment.status !== "paid" ? (
            <AdminButton
              variant="positive"
              onClick={() => {
                setPanel("paid");
                setError(null);
              }}
            >
              Отбележи като платено
            </AdminButton>
          ) : null}
          {actions.recordPayments && (payment.status === "paid" || payment.status === "partially_paid") ? (
            <AdminButton variant="ghost" onClick={() => setRevertOpen(true)}>
              Върни статус
            </AdminButton>
          ) : null}
        </div>
      ) : null}

      {/* Everyone who may attach can do it here at any time — also once the
          stage is paid; recording a payment can attach in the same step. */}
      {actions.attach && !cancelled && panel === "none" ? (
        <div className="mt-auto pt-2">
          {/* Visually hidden, not display:none, so the keyboard can still reach the input. */}
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-1 text-sm font-bold text-brand hover:underline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand">
            <input
              ref={attachOnlyRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => void onAttachOnly(e)}
              className="sr-only"
            />
            {busy ? "Качване…" : "＋ Прикачи платежен документ"}
          </label>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={revertOpen}
        title="Връщане на статуса?"
        message="Отбелязаното плащане ще бъде изчистено, а действието остава записано в историята."
        tone="danger"
        isPending={busy}
        onConfirm={onRevert}
        onCancel={() => setRevertOpen(false)}
      />
    </div>
  );
}
