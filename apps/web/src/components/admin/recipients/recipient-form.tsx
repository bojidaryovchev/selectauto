"use client";

import { useState } from "react";
import { RECIPIENT_KIND_META, type RecipientKind } from "@/constants/contracts";
import { saveRecipient } from "@/mutations/recipients";
import type { RecipientRow } from "@/queries/recipients";

/**
 * Create/edit form for one payment recipient (/admin/poluchateli — spec §8).
 * Plain controlled inputs like the other admin forms (TariffUploadForm); the
 * shared zod schema re-validates server-side in `saveRecipient`. The fixed
 * SelectAuto row keeps its kind and can't be deactivated (the mutation enforces
 * it too); admins may add international partners and customs brokers only.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

const INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";

/** The kinds an admin may pick for a NEW recipient (SelectAuto is a seeded singleton). */
const CREATABLE_KINDS: RecipientKind[] = ["international_partner", "customs_broker"];

export function RecipientForm({
  recipient,
  onDone,
  onCancel,
}: {
  /** The row being edited, or null to create a new recipient. */
  recipient: RecipientRow | null;
  /** Called after a successful save (the parent refreshes the list). */
  onDone: () => void;
  onCancel: () => void;
}) {
  const isSelectAuto = recipient?.slug === "selectauto";

  const [kind, setKind] = useState<RecipientKind>(
    (recipient?.kind as RecipientKind | undefined) ?? "international_partner",
  );
  const [name, setName] = useState(recipient?.name ?? "");
  const [country, setCountry] = useState(recipient?.country ?? "");
  const [address, setAddress] = useState(recipient?.address ?? "");
  const [vatNumber, setVatNumber] = useState(recipient?.vatNumber ?? "");
  const [bankName, setBankName] = useState(recipient?.bankName ?? "");
  const [bankAddress, setBankAddress] = useState(recipient?.bankAddress ?? "");
  const [iban, setIban] = useState(recipient?.iban ?? "");
  const [swiftBic, setSwiftBic] = useState(recipient?.swiftBic ?? "");
  const [routingCode, setRoutingCode] = useState(recipient?.routingCode ?? "");
  const [currency, setCurrency] = useState(recipient?.currency ?? "EUR");
  const [chargesInstruction, setChargesInstruction] = useState(recipient?.chargesInstruction ?? "");
  const [paymentMethod, setPaymentMethod] = useState(recipient?.paymentMethod ?? "");
  const [active, setActive] = useState(recipient?.active ?? true);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await saveRecipient({
        id: recipient?.id,
        values: {
          kind,
          name,
          country,
          address,
          vatNumber,
          bankName,
          bankAddress,
          iban,
          swiftBic,
          routingCode,
          currency,
          chargesInstruction,
          paymentMethod,
          active,
        },
      });
      if (result.success) {
        onDone();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Възникна грешка при запис. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <h3 className="text-lg font-black text-ink">
        {recipient ? `Редакция: ${recipient.name}` : "Нов получател"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Тип</label>
          {isSelectAuto ? (
            <p className="rounded-lg border border-line bg-neutral-50 px-3 py-2 text-sm text-muted">
              SelectAuto (фиксиран)
            </p>
          ) : (
            <select value={kind} onChange={(e) => setKind(e.target.value as RecipientKind)} className={INPUT}>
              {CREATABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {RECIPIENT_KIND_META[k].label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Наименование *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Държава</label>
          <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">ДДС / рег. номер</label>
          <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-semibold text-ink">Адрес</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Банка</label>
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Адрес на банката</label>
          <input type="text" value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">IBAN / Сметка</label>
          <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">SWIFT / BIC</label>
          <input type="text" value={swiftBic} onChange={(e) => setSwiftBic(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Routing code (за неевропейски преводи)</label>
          <input
            type="text"
            value={routingCode}
            onChange={(e) => setRoutingCode(e.target.value)}
            placeholder="напр. CC000100381"
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Валута</label>
          <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="EUR / USD" className={INPUT} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Разноски на превода</label>
          <input
            type="text"
            value={chargesInstruction}
            onChange={(e) => setChargesInstruction(e.target.value)}
            placeholder="напр. За сметка на изпращача (OUR)"
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Вид плащане</label>
          <input
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="напр. BLINK"
            className={INPUT}
          />
        </div>

        {isSelectAuto ? null : (
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 accent-brand"
            />
            Активен
          </label>
        )}
      </div>

      {status.kind === "error" ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">{status.message}</p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Запазване…" : "Запази"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-6 text-sm font-extrabold text-ink transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          Отказ
        </button>
      </div>
    </form>
  );
}
