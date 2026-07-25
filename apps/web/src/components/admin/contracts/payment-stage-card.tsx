"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  PAYMENT_STAGE_META,
  STAGE_ALLOWED_RECIPIENT_KINDS,
  type PaymentStage,
} from "@/constants/contracts";
import { dbToCents, formatCents, formatDbAmount } from "@/lib/money";
import { addPaymentAttachment, generatePaymentNotice, markPaymentPaid, revertPayment } from "@/mutations/contracts";
import type { ContractPaymentWithRecipient, GeneratedDocumentRow, PaymentAttachmentRow } from "@/queries/contracts";
import type { RecipientRow } from "@/queries/recipients";
import { PaymentStatusBadge } from "./payment-status-badge";

/**
 * One payment-stage card on the contract detail (spec §4): due sum, status,
 * recipient, versions of the generated notice, and the three §4.3/§6 actions —
 * generate a notice (with the §5 recipient rules and the §16 курс field, plus
 * the §6.3 preview step), mark as paid (partial allowed), revert. All rules are
 * re-validated server-side; the UI only *hides* what's invalid.
 */
type Panel = "none" | "generate" | "preview" | "paid";

const INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const LABEL = "text-xs font-semibold text-ink";

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

export function PaymentStageCard({
  payment,
  contract,
  recipients,
  documents,
  attachments,
}: {
  payment: ContractPaymentWithRecipient;
  contract: { id: number; number: string; market: string; currency: string; status: string };
  /** ACTIVE recipients only (the page filters). */
  recipients: RecipientRow[];
  /** Notice versions for THIS payment, newest first. */
  documents: GeneratedDocumentRow[];
  /** Uploaded proof-of-payment files for THIS payment, newest first. */
  attachments: PaymentAttachmentRow[];
}) {
  const router = useRouter();
  const stage = payment.stage as PaymentStage;
  const stageMeta = PAYMENT_STAGE_META[stage];

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
  const [basis, setBasis] = useState(payment.basis ?? "");
  const [dueDate, setDueDate] = useState(payment.dueDate ?? "");
  const [paidAmount, setPaidAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const chosen = allowed.find((r) => r.id === (isFinalStage ? fixedFinal?.id : recipientId));
  const needsRate = contract.market === "us_ca" && chosen?.kind === "selectauto";
  const remainingCents = dbToCents(payment.dueAmount) - dbToCents(payment.paidAmount);
  const versionCount = documents.length;
  const cancelled = contract.status === "cancelled";

  function resetPanels() {
    setPanel("none");
    setError(null);
  }

  async function onGenerateConfirm() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generatePaymentNotice({
        paymentId: payment.id,
        recipientId: chosen.id,
        usdEurRate: needsRate ? rate : undefined,
        basis,
        dueDate: dueDate || undefined,
      });
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
    setBusy(true);
    setError(null);
    try {
      const result = await markPaymentPaid({ paymentId: payment.id, paidAmount, paidAt, note });
      if (!result.success) {
        setError(result.error);
        return;
      }

      // The payment is recorded; attaching the proof is a separate, secondary
      // step — a failed upload reports itself but never un-records the payment.
      const file = fileRef.current?.files?.[0];
      if (file) {
        const fd = new FormData();
        fd.set("paymentId", String(payment.id));
        fd.set("file", file);
        const upload = await addPaymentAttachment(fd);
        if (!upload.success) {
          setError(`Плащането е записано, но файлът не се прикачи: ${upload.error}`);
          router.refresh();
          return;
        }
      }

      resetPanels();
      setPaidAmount("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Възникна грешка. Моля опитайте отново.");
    } finally {
      setBusy(false);
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
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-ink">{stageMeta?.label ?? payment.stage}</h3>
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
            <dd className="inline text-ink">{payment.basis}</dd>
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
            <dd className="inline text-ink">{payment.note}</dd>
          </div>
        ) : null}
      </dl>

      {/* Versions */}
      {versionCount > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Известия</p>
          {documents.map((d) => (
            <a
              key={d.id}
              href={`/api/payment-document/${d.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Версия {d.version} — {d.createdAt.toLocaleString("bg-BG")} ⬇
            </a>
          ))}
        </div>
      ) : null}

      {/* Прикачени платежни документи (§4.3) */}
      {attachments.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Прикачени документи</p>
          {attachments.map((a) => (
            <a
              key={a.id}
              href={`/api/payment-attachment/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-semibold text-brand hover:underline"
              title={a.filename}
            >
              {a.filename} ⬇
            </a>
          ))}
        </div>
      ) : null}

      {error && panel !== "generate" ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-semibold text-[#b3261e]">{error}</p>
      ) : null}

      {/* ── Generate panel ── */}
      {panel === "generate" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3">
          {isFinalStage ? (
            <p className="text-sm text-ink">
              Получател: <span className="font-bold">{fixedFinal?.name ?? "SelectAuto"}</span> (фиксиран)
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Получател</label>
              <select
                value={recipientId ?? ""}
                onChange={(e) => setRecipientId(e.target.value ? Number(e.target.value) : undefined)}
                className={INPUT}
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
              <label className={LABEL}>Курс USD/EUR *</label>
              <input
                type="text"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="напр. 0.86"
                className={INPUT}
              />
              {rate && rateValid ? (
                <p className="text-xs text-muted">
                  {formatDbAmount(payment.dueAmount)} USD × {rate.replace(",", ".")} ={" "}
                  {formatCents(Math.round(dbToCents(payment.dueAmount) * Number(rate.replace(",", "."))))} EUR
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Основание</label>
            <input type="text" value={basis} onChange={(e) => setBasis(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Падеж (по избор)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
          </div>
          {error ? (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-semibold text-[#b3261e]">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !chosen || (needsRate && !rateValid)}
              onClick={() => setPanel("preview")}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Преглед →
            </button>
            <button type="button" onClick={resetPanels} className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted">
              Отказ
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Preview (§6.3) + confirm ── */}
      {panel === "preview" && chosen ? (
        <div className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3 text-sm">
          <p className="font-bold text-ink">Преглед преди генериране</p>
          <dl className="flex flex-col gap-0.5">
            <div>
              <dt className="inline text-muted">Договор: </dt>
              <dd className="inline font-semibold text-ink">{contract.number}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Етап: </dt>
              <dd className="inline font-semibold text-ink">{stageMeta?.label}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Получател: </dt>
              <dd className="inline font-semibold text-ink">{chosen.name}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Сума: </dt>
              <dd className="inline font-semibold text-ink">
                {formatDbAmount(payment.dueAmount)} {payment.currency}
              </dd>
            </div>
            {needsRate ? (
              <div>
                <dt className="inline text-muted">Курс / EUR: </dt>
                <dd className="inline font-semibold text-ink">
                  {rate.replace(",", ".")} → {formatCents(Math.round(dbToCents(payment.dueAmount) * Number(rate.replace(",", "."))))} EUR
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="inline text-muted">Основание: </dt>
              <dd className="inline font-semibold text-ink">{basis || `Договор № ${contract.number}`}</dd>
            </div>
          </dl>
          {versionCount > 0 ? (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
              Вече има {versionCount} генерирана(и) версия(и) — потвърждението ще създаде версия {versionCount + 1},
              без да изтрива старите.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onGenerateConfirm}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Генериране…" : "Потвърди и генерирай PDF"}
            </button>
            <button
              type="button"
              onClick={() => setPanel("generate")}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted"
            >
              ← Назад
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Mark-paid panel ── */}
      {panel === "paid" ? (
        <form onSubmit={onMarkPaid} className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Реално платена сума ({payment.currency})</label>
            <input
              type="text"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder={formatCents(remainingCents)}
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Дата на плащане</label>
            <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Бележка</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Платежен документ (PDF/снимка, до 8 MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-neutral-200 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink"
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-semibold text-[#b3261e]">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Запазване…" : "Запази плащането"}
            </button>
            <button type="button" onClick={resetPanels} className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted">
              Отказ
            </button>
          </div>
        </form>
      ) : null}

      {/* ── Actions ── */}
      {panel === "none" && !cancelled ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setPanel("generate");
              setError(null);
            }}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
          >
            Генерирай известие
          </button>
          {payment.status !== "paid" ? (
            <button
              type="button"
              onClick={() => {
                setPanel("paid");
                setError(null);
              }}
              className="rounded-full border border-emerald-600 px-4 py-1.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Отбележи като платено
            </button>
          ) : null}
          {payment.status === "paid" || payment.status === "partially_paid" ? (
            <button
              type="button"
              onClick={() => setRevertOpen(true)}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted hover:text-ink"
            >
              Върни статус
            </button>
          ) : null}
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
