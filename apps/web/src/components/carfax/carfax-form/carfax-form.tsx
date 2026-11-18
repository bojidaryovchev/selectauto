"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { AlertIcon, CircleCheckIcon, LockIcon } from "@/components/icons";
import { normalizePhone } from "@/lib/phone";
import { carfaxSchema, type CarfaxFormValues } from "@/schemas/carfax.schema";

/**
 * Carfax inquiry form (name, phone and VIN required; phone normalised; VIN upper-cased), built on react-hook-form +
 * zod, in the kit (boards `in-carfax`, `in-carfax-flow`, `in-carfax-msgs`, and the dialog's `in-vin-dlg`,
 * `in-vin-carfax`): labels above the fields, the required ones marked, each error under its field with an icon and
 * focus moved to the first, a busy button while sending, and the server's message in an alert above it — green when
 * sent (the contact fields clear), red otherwise (the data stays for another try).
 */

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type FieldName = keyof CarfaxFormValues;

/**
 * @param defaults     Seed values (VIN/make/model) — supplied by the CarfaxDialog
 *   on a car page so the form opens pre-filled. Absent on the standalone /carfax page.
 * @param lockedFields Field names to render read-only (their `defaults` value is
 *   fixed) — the car's VIN/make/model can't be edited from a detail page.
 * @param stack        One field per row, for the dialog; the page form pairs its fields.
 * @param onSuccess    Called after a successful submit (the dialog auto-closes).
 */
export function CarfaxForm({
  defaults,
  lockedFields,
  stack = false,
  onSuccess,
}: {
  defaults?: Partial<CarfaxFormValues>;
  lockedFields?: readonly FieldName[];
  stack?: boolean;
  onSuccess?: () => void;
} = {}) {
  const uid = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const locked = new Set(lockedFields);
  const isLocked = (name: FieldName) => locked.has(name);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CarfaxFormValues>({
    resolver: zodResolver(carfaxSchema),
    // Re-validate as the user types after the first submit attempt, so each
    // inline error clears the moment its field is fixed.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      vin: "",
      car_make: "",
      car_model: "",
      message: "",
      ...defaults,
    },
  });

  async function onSubmit(values: CarfaxFormValues) {
    setStatus({ kind: "idle" });
    const phone = normalizePhone(values.phone);
    const vin = values.vin.trim().toUpperCase();

    const payload = {
      ...values,
      phone,
      vin,
      // The actual page the lead came from. Client component, so the submit
      // handler always runs in the browser.
      page_url: window.location.href,
    };

    try {
      const response = await fetch("/api/carfax-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (response.ok && result.success) {
        setStatus({
          kind: "success",
          message: result.message ?? "Успешно изпратено.",
        });
        // Restores the seeded (locked) values; clears the contact fields.
        reset();
        onSuccess?.();
      } else {
        setStatus({
          kind: "error",
          message: result.message ?? "Възникна грешка.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Възникна грешка при изпращането. Моля, опитайте отново.",
      });
    }
  }

  function onInvalid(formErrors: typeof errors) {
    // Each invalid field shows its own hint; clear any stale submit result and take the user to the first one.
    setStatus({ kind: "idle" });
    const firstInvalid = (["full_name", "phone", "vin"] as const).find((field) => formErrors[field]);
    if (firstInvalid) setFocus(firstInvalid);
  }

  /** A kit field: the label (with „*" when required), the input, and its error under it. */
  const field = (
    name: FieldName,
    label: string,
    required: boolean,
    input: (props: { id: string; invalid: boolean; describedBy?: string }) => ReactNode,
  ) => {
    const id = `${uid}-${name}`;
    const error = errors[name]?.message;
    return (
      <div className="sa-fld">
        <label className="sa-lbl" htmlFor={id}>
          {label}
          {required ? <i> *</i> : null}
        </label>
        {input({ id, invalid: !!error, describedBy: error ? `${id}-err` : undefined })}
        {error ? (
          <span id={`${id}-err`} className="sa-err">
            <AlertIcon />
            {error}
          </span>
        ) : null}
      </div>
    );
  };

  /** A text input; locked ones are read-only (kept in the submission), dashed, with a lock. */
  const textInput = (
    name: FieldName,
    { id, invalid, describedBy }: { id: string; invalid: boolean; describedBy?: string },
    extra: { type?: string; placeholder: string; inputMode?: "tel"; autoComplete?: string; vin?: boolean; lockTitle?: string },
  ) => {
    const cls = `sa-in ${extra.vin ? "in-vin" : ""} ${invalid ? "is-err" : ""}`;
    const common = {
      id,
      type: extra.type ?? "text",
      placeholder: extra.placeholder,
      inputMode: extra.inputMode,
      autoComplete: extra.autoComplete,
      "aria-invalid": invalid || undefined,
      "aria-describedby": describedBy,
      ...register(name),
    };
    if (isLocked(name)) {
      return (
        <span className="sa-inw">
          <input {...common} readOnly title={extra.lockTitle} className={`${cls} in-lock has-end pl-3.5`} />
          <span className="in-lock__ic" aria-hidden="true">
            <LockIcon />
          </span>
        </span>
      );
    }
    return <input {...common} className={cls} />;
  };

  const pair = (a: ReactNode, b: ReactNode) =>
    stack ? (
      <>
        {a}
        {b}
      </>
    ) : (
      <div className="sa-form__row">
        {a}
        {b}
      </div>
    );

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="sa-form">
      {pair(
        field("full_name", "Име и фамилия", true, (p) => textInput("full_name", p, { placeholder: "Име и фамилия" })),
        field("phone", "Телефон", true, (p) =>
          textInput("phone", p, { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "+359XXXXXXXXX" }),
        ),
      )}
      {pair(
        field("email", "Имейл", false, (p) => textInput("email", p, { type: "email", placeholder: "example@email.com" })),
        field("vin", isLocked("vin") ? "VIN номер (от обявата)" : "VIN номер", true, (p) =>
          textInput("vin", p, {
            placeholder: "Например: 1HGCM82633A123456",
            vin: true,
            lockTitle: "Заключено — VIN на този автомобил",
          }),
        ),
      )}
      {pair(
        field("car_make", isLocked("car_make") ? "Марка (от обявата)" : "Марка", false, (p) =>
          textInput("car_make", p, { placeholder: "Например: BMW", lockTitle: "Заключено — марка на този автомобил" }),
        ),
        field("car_model", isLocked("car_model") ? "Модел (от обявата)" : "Модел", false, (p) =>
          textInput("car_model", p, { placeholder: "Например: X5", lockTitle: "Заключено — модел на този автомобил" }),
        ),
      )}
      {field("message", "Допълнителна информация", false, ({ id, invalid, describedBy }) => (
        <textarea
          id={id}
          placeholder="По желание: година, линк към обява, допълнителни детайли..."
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`sa-in ${invalid ? "is-err" : ""}`}
          {...register("message")}
        />
      ))}

      {status.kind !== "idle" ? (
        <div
          className={`sa-alert ${status.kind === "success" ? "sa-alert--pos" : "sa-alert--neg"}`}
          role={status.kind === "success" ? "status" : "alert"}
        >
          {status.kind === "success" ? <CircleCheckIcon /> : <AlertIcon />}
          <div>
            <b>{status.message}</b>
          </div>
        </div>
      ) : null}

      {/* While sending, the busy button keeps its label and full strength (the kit dims a disabled one). */}
      <Button type="submit" variant="pri" size="xl" block busy={isSubmitting} disabled={isSubmitting} className="opacity-100">
        Изпратете запитването
      </Button>
    </form>
  );
}
