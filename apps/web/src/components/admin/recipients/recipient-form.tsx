"use client";

import { ADMIN_HINT, ADMIN_INPUT, ADMIN_LABEL, ADMIN_SELECT, AdminBanner, AdminButton } from "@/components/admin/ui";
import { RECIPIENT_KIND_META, type RecipientKind } from "@/constants/contracts";
import { saveRecipient } from "@/mutations/recipients";
import type { RecipientRow } from "@/queries/recipients";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Create/edit form for one payment recipient (/admin/poluchateli — spec §8).
 * Plain controlled inputs like the other admin forms; the shared zod schema
 * re-validates server-side in `saveRecipient`. The fixed SelectAuto row keeps
 * its kind and can't be deactivated (the mutation enforces it too); admins may
 * add international partners and customs brokers only.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

/** The kinds an admin may pick for a NEW recipient (SelectAuto is a seeded singleton). */
const CREATABLE_KINDS: RecipientKind[] = ["international_partner", "customs_broker"];

/** Codes typed in capitals and never „corrected" by a phone keyboard. */
const CODE = { autoCapitalize: "characters", autoCorrect: "off", spellCheck: false } as const;

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
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();

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

  // The form replaces its card in place; bring all of it into view when it opens.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);

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
      setStatus({ kind: "error", message: "Връзката прекъсна — получателят не е запазен. Опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: string) => `${id}-${key}`;

  return (
    // Edited in place of its card, so it stands out from the cards around it.
    <section className="min-w-0 rounded-xl border border-brand/40 bg-white p-4 shadow-card sm:p-5">
      <form ref={ref} onSubmit={onSubmit} className="@container flex scroll-mt-20 flex-col gap-4">
        <h2 className="text-lg font-black wrap-anywhere text-ink">
          {recipient ? `Редакция: ${recipient.name}` : "Нов получател"}
        </h2>

        {isSelectAuto ? (
          <p className={ADMIN_HINT}>
            Тези данни отиват в известията за плащане. Договорите и договорите за депозит печатат данните на SelectAuto
            от кода на сайта (сега са същите) — промяна тук не ги променя.
          </p>
        ) : null}

        <div className="grid gap-4 @xl:grid-cols-2">
          {isSelectAuto ? (
            <div className="flex min-w-0 flex-col gap-1">
              <span className={ADMIN_LABEL}>Тип</span>
              <p className="rounded-lg border border-line bg-neutral-50 px-3 py-2.5 text-base text-muted sm:text-sm">
                SelectAuto (фиксиран)
              </p>
            </div>
          ) : (
            <Field id={field("kind")} label="Тип">
              <select
                id={field("kind")}
                value={kind}
                onChange={(e) => setKind(e.target.value as RecipientKind)}
                className={ADMIN_SELECT}
              >
                {CREATABLE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {RECIPIENT_KIND_META[k].label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field id={field("name")} label="Наименование *">
            <input
              id={field("name")}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("country")} label="Държава">
            <input
              id={field("country")}
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("vat")} label="ДДС / рег. номер">
            <input
              id={field("vat")}
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              {...CODE}
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("address")} label="Адрес" wide>
            <input
              id={field("address")}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("bank")} label="Банка">
            <input
              id={field("bank")}
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("bankAddress")} label="Адрес на банката">
            <input
              id={field("bankAddress")}
              type="text"
              value={bankAddress}
              onChange={(e) => setBankAddress(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("iban")} label="IBAN / Сметка">
            <input
              id={field("iban")}
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              {...CODE}
              className={`${ADMIN_INPUT} font-mono`}
            />
          </Field>

          <Field id={field("swift")} label="SWIFT / BIC">
            <input
              id={field("swift")}
              type="text"
              value={swiftBic}
              onChange={(e) => setSwiftBic(e.target.value)}
              {...CODE}
              className={`${ADMIN_INPUT} font-mono`}
            />
          </Field>

          <Field id={field("routing")} label="Routing code (за неевропейски преводи)">
            <input
              id={field("routing")}
              type="text"
              value={routingCode}
              onChange={(e) => setRoutingCode(e.target.value)}
              placeholder="напр. CC000100381"
              {...CODE}
              className={`${ADMIN_INPUT} font-mono`}
            />
          </Field>

          <Field id={field("currency")} label="Валута">
            <input
              id={field("currency")}
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="EUR / USD"
              {...CODE}
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("charges")} label="Разноски на превода">
            <input
              id={field("charges")}
              type="text"
              value={chargesInstruction}
              onChange={(e) => setChargesInstruction(e.target.value)}
              placeholder="напр. За сметка на изпращача (OUR)"
              className={ADMIN_INPUT}
            />
          </Field>

          <Field id={field("method")} label="Вид плащане">
            <input
              id={field("method")}
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="напр. BLINK"
              className={ADMIN_INPUT}
            />
          </Field>

          {isSelectAuto ? null : (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-5 accent-brand"
              />
              Активен — предлага се при генериране на известия
            </label>
          )}
        </div>

        {status.kind === "error" ? <AdminBanner tone="error">{status.message}</AdminBanner> : null}

        <div className="flex flex-wrap gap-2">
          <AdminButton type="submit" variant="primary" size="lg" disabled={busy}>
            {busy ? "Запазване…" : "Запази"}
          </AdminButton>
          <AdminButton variant="secondary" size="lg" onClick={onCancel} disabled={busy}>
            Отказ
          </AdminButton>
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  wide,
  children,
}: {
  id: string;
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${wide ? "@xl:col-span-2" : ""}`}>
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
      </label>
      {children}
    </div>
  );
}
