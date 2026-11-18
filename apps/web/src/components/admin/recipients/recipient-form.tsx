"use client";

import { ADMIN_INPUT, AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { AlertIcon, CheckIcon, ChevronDownIcon } from "@/components/icons";
import { RECIPIENT_KIND_META, type RecipientKind } from "@/constants/contracts";
import { saveRecipient } from "@/mutations/recipients";
import type { RecipientRow } from "@/queries/recipients";
import { recipientSchema } from "@/schemas/recipient.schema";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Create/edit form for one payment recipient (/admin/poluchateli — spec §8; boards `ad-recipients-edit`,
 * `ad-recipients-states`; parity check docs/design/parity/admin-recipients.md). The shared zod schema runs here first
 * (`noValidate`): each message sits under its field, and the server re-validates in `saveRecipient`. The fixed
 * SelectAuto row keeps its kind and can't be deactivated (the mutation enforces it too); admins may add international
 * partners and customs brokers only.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

type FieldKey =
  | "name"
  | "country"
  | "address"
  | "vatNumber"
  | "bankName"
  | "bankAddress"
  | "iban"
  | "swiftBic"
  | "routingCode"
  | "currency"
  | "chargesInstruction"
  | "paymentMethod";

/** The kinds an admin may pick for a NEW recipient (SelectAuto is a seeded singleton). */
const CREATABLE_KINDS: RecipientKind[] = ["international_partner", "customs_broker"];

/** Codes typed in capitals and never „corrected" by a phone keyboard. */
const CODE = { autoCapitalize: "characters", autoCorrect: "off", spellCheck: false } as const;

/** The kit's checkbox, with the focus ring on its box. */
const CHECKBOX =
  "sa-chk ad-chk has-focus-visible:[&_.sa-box]:outline-2 has-focus-visible:[&_.sa-box]:outline-offset-2 has-focus-visible:[&_.sa-box]:outline-ortx";

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
  const nameRef = useRef<HTMLInputElement>(null);
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
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);

  const fieldIds: Record<FieldKey, string> = {
    name: `${id}-name`,
    country: `${id}-country`,
    address: `${id}-address`,
    vatNumber: `${id}-vat`,
    bankName: `${id}-bank`,
    bankAddress: `${id}-bankAddress`,
    iban: `${id}-iban`,
    swiftBic: `${id}-swift`,
    routingCode: `${id}-routing`,
    currency: `${id}-currency`,
    chargesInstruction: `${id}-charges`,
    paymentMethod: `${id}-method`,
  };

  // The form replaces its card in place; bring all of it into view when it opens. A new recipient starts at its name.
  const [isNew] = useState(recipient === null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
    if (isNew) nameRef.current?.focus({ preventScroll: true });
  }, [isNew]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = {
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
    };

    // The server's own schema, first: each message under its field.
    const parsed = recipientSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<FieldKey, string>> = {};
      let unplaced: string | null = null;
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in fieldIds) next[key as FieldKey] ??= issue.message;
        else unplaced ??= issue.message;
      }
      setErrors(next);
      setStatus(unplaced ? { kind: "error", message: unplaced } : { kind: "idle" });
      // As the browser's bubble did: to the first field that needs a look.
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});

    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await saveRecipient({ id: recipient?.id, values });
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


  /** A text field: its control tied to its label and to its message. */
  const text = (
    key: FieldKey,
    value: string,
    set: (v: string) => void,
    extra: React.ComponentProps<"input"> & { mono?: boolean } = {},
  ) => {
    const { mono, className, ...rest } = extra;
    const error = errors[key];
    return (
      <input
        id={fieldIds[key]}
        type="text"
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldIds[key]}-err` : undefined}
        className={[ADMIN_INPUT, mono ? "ad-mono" : null, error ? "is-err" : null, className].filter(Boolean).join(" ")}
        {...rest}
      />
    );
  };

  return (
    // Edited in place of its card, so it stands out from the cards around it.
    <section className="sa-pnl ad-form">
      <form ref={ref} onSubmit={onSubmit} noValidate className="ad-formin scroll-mt-20">
        <h2>{recipient ? `Редакция: ${recipient.name}` : "Нов получател"}</h2>

        {isSelectAuto ? (
          <p className="ad-hint">
            Тези данни отиват в известията за плащане. Договорите и договорите за депозит печатат данните на SelectAuto
            от кода на сайта (сега са същите) — промяна тук не ги променя.
          </p>
        ) : null}

        <div className="ad-fgrid">
          {isSelectAuto ? (
            <div className="sa-fld">
              <span className="sa-lbl">Тип</span>
              <p className="ad-fixed">SelectAuto (фиксиран)</p>
            </div>
          ) : (
            <Field id={`${id}-kind`} label="Тип">
              <span className="sa-selw">
                <select
                  id={`${id}-kind`}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as RecipientKind)}
                  className={ADMIN_INPUT}
                >
                  {CREATABLE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {RECIPIENT_KIND_META[k].label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon />
              </span>
            </Field>
          )}

          <Field
            id={fieldIds.name}
            label={
              <>
                Наименование <i>*</i>
              </>
            }
            error={errors.name}
          >
            {text("name", name, setName, { ref: nameRef, required: true })}
          </Field>

          <Field id={fieldIds.country} label="Държава" error={errors.country}>
            {text("country", country, setCountry)}
          </Field>

          <Field id={fieldIds.vatNumber} label="ДДС / рег. номер" error={errors.vatNumber}>
            {text("vatNumber", vatNumber, setVatNumber, CODE)}
          </Field>

          <Field id={fieldIds.address} label="Адрес" error={errors.address} wide>
            {text("address", address, setAddress)}
          </Field>

          <Field id={fieldIds.bankName} label="Банка" error={errors.bankName}>
            {text("bankName", bankName, setBankName)}
          </Field>

          <Field id={fieldIds.bankAddress} label="Адрес на банката" error={errors.bankAddress}>
            {text("bankAddress", bankAddress, setBankAddress)}
          </Field>

          <Field id={fieldIds.iban} label="IBAN / Сметка" error={errors.iban}>
            {text("iban", iban, setIban, { ...CODE, mono: true })}
          </Field>

          <Field id={fieldIds.swiftBic} label="SWIFT / BIC" error={errors.swiftBic}>
            {text("swiftBic", swiftBic, setSwiftBic, { ...CODE, mono: true })}
          </Field>

          <Field id={fieldIds.routingCode} label="Routing code (за неевропейски преводи)" error={errors.routingCode}>
            {text("routingCode", routingCode, setRoutingCode, { ...CODE, mono: true, placeholder: "напр. CC000100381" })}
          </Field>

          <Field id={fieldIds.currency} label="Валута" error={errors.currency}>
            {text("currency", currency, setCurrency, { ...CODE, placeholder: "EUR / USD" })}
          </Field>

          <Field id={fieldIds.chargesInstruction} label="Разноски на превода" error={errors.chargesInstruction}>
            {text("chargesInstruction", chargesInstruction, setChargesInstruction, {
              placeholder: "напр. За сметка на изпращача (OUR)",
            })}
          </Field>

          <Field id={fieldIds.paymentMethod} label="Вид плащане" error={errors.paymentMethod}>
            {text("paymentMethod", paymentMethod, setPaymentMethod, { placeholder: "напр. BLINK" })}
          </Field>

          {isSelectAuto ? null : (
            <label className={`${CHECKBOX} ${active ? "is-on" : ""}`}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="sa-box">
                <CheckIcon />
              </span>
              <span>Активен — предлага се при генериране на известия</span>
            </label>
          )}
        </div>

        {status.kind === "error" ? <AdminBanner tone="error">{status.message}</AdminBanner> : null}

        <div className="ad-form__f">
          <Button type="submit" variant="pri" disabled={busy} busy={busy}>
            {busy ? "Запазване…" : "Запазете"}
          </Button>
          <Button variant="sec" onClick={onCancel} disabled={busy}>
            Отказ
          </Button>
        </div>
      </form>
    </section>
  );
}

/** A labelled control with its message under it. */
function Field({
  id,
  label,
  error,
  wide,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sa-fld is-wide" : "sa-fld"}>
      <label htmlFor={id} className="sa-lbl">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-err`} className="sa-err">
          <AlertIcon />
          {error}
        </span>
      ) : null}
    </div>
  );
}
