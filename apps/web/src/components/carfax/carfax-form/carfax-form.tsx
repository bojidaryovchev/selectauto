"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { carfaxSchema, type CarfaxFormValues } from "@/schemas/carfax.schema";
import { Button } from "@/components/common";
import { normalizePhone } from "@/lib/phone";
import { FormField } from "./form-field";

/**
 * Carfax inquiry form (name, phone and VIN required; phone normalised; VIN
 * upper-cased), built on react-hook-form + zod. Field-level validation messages
 * are surfaced inline, matching the repo's `ConsultationForm` pattern, with a
 * single status box for the submit result.
 */

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const INPUT_CLASS =
  "min-h-[54px] w-full appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 text-base font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,transform] duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none";

/** Read-only (locked) variant — greyed, non-interactive. Used for the car's fixed
 *  VIN/make/model when the form runs inside the in-page CarfaxDialog. `readOnly`
 *  (not `disabled`) so react-hook-form keeps the value in the submission. */
const LOCKED_INPUT_CLASS =
  "min-h-[54px] w-full cursor-not-allowed appearance-none rounded-[14px] border border-[#e3e6ea] bg-[#f2f3f5] px-4 text-base font-semibold text-[#5f636b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none";

/**
 * @param defaults     Seed values (VIN/make/model) — supplied by the CarfaxDialog
 *   on a car page so the form opens pre-filled. Absent on the standalone /carfax page.
 * @param lockedFields Field names to render read-only (their `defaults` value is
 *   fixed) — the car's VIN/make/model can't be edited from a detail page.
 * @param stack        Force a single-column layout for the narrow dialog; the page
 *   form keeps its 2-column grid.
 * @param onSuccess    Called after a successful submit (the dialog auto-closes).
 */
export function CarfaxForm({
  defaults,
  lockedFields,
  stack = false,
  onSuccess,
}: {
  defaults?: Partial<CarfaxFormValues>;
  lockedFields?: readonly (keyof CarfaxFormValues)[];
  stack?: boolean;
  onSuccess?: () => void;
} = {}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const locked = new Set(lockedFields);
  const isLocked = (name: keyof CarfaxFormValues) => locked.has(name);
  const inputClass = (name: keyof CarfaxFormValues) => (isLocked(name) ? LOCKED_INPUT_CLASS : INPUT_CLASS);
  // Field pairs sit side-by-side on the page form, but stack in the dialog.
  const rowClass = stack ? "grid gap-3.5" : "grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1";

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
        message: "Възникна грешка при изпращането. Моля опитайте отново.",
      });
    }
  }

  function onInvalid(formErrors: typeof errors) {
    // Don't echo field errors into the status box — each invalid field already
    // shows its own inline hint, and repeating them here is what produced the
    // stacked "wall of red". Just clear any stale submit result and move focus
    // to the first invalid field so the user is taken straight to it.
    setStatus({ kind: "idle" });
    const firstInvalid = (
      ["full_name", "phone", "vin"] as const
    ).find((field) => formErrors[field]);
    if (firstInvalid) setFocus(firstInvalid);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="grid gap-3.5"
    >
      <div className={rowClass}>
        <FormField
          id="saCarfaxName"
          label="Име и фамилия"
          error={errors.full_name?.message}
        >
          <input
            id="saCarfaxName"
            type="text"
            placeholder="Име и фамилия"
            required
            className={INPUT_CLASS}
            {...register("full_name")}
          />
        </FormField>

        <FormField id="saCarfaxPhone" label="Телефон" error={errors.phone?.message}>
          <input
            id="saCarfaxPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+359XXXXXXXXX"
            required
            className={INPUT_CLASS}
            {...register("phone")}
          />
        </FormField>
      </div>

      <div className={rowClass}>
        <FormField id="saCarfaxEmail" label="Имейл" error={errors.email?.message}>
          <input
            id="saCarfaxEmail"
            type="email"
            placeholder="example@email.com"
            className={INPUT_CLASS}
            {...register("email")}
          />
        </FormField>

        <FormField
          id="saCarfaxVin"
          label={isLocked("vin") ? "VIN номер (от обявата)" : "VIN номер"}
          error={errors.vin?.message}
        >
          <input
            id="saCarfaxVin"
            type="text"
            placeholder="Например: 1HGCM82633A123456"
            required
            readOnly={isLocked("vin")}
            title={isLocked("vin") ? "Заключено — VIN на този автомобил" : undefined}
            className={inputClass("vin")}
            {...register("vin")}
          />
        </FormField>
      </div>

      <div className={rowClass}>
        <FormField
          id="saCarfaxMake"
          label={isLocked("car_make") ? "Марка (от обявата)" : "Марка"}
          error={errors.car_make?.message}
        >
          <input
            id="saCarfaxMake"
            type="text"
            placeholder="Например: BMW"
            readOnly={isLocked("car_make")}
            title={isLocked("car_make") ? "Заключено — марка на този автомобил" : undefined}
            className={inputClass("car_make")}
            {...register("car_make")}
          />
        </FormField>

        <FormField
          id="saCarfaxModel"
          label={isLocked("car_model") ? "Модел (от обявата)" : "Модел"}
          error={errors.car_model?.message}
        >
          <input
            id="saCarfaxModel"
            type="text"
            placeholder="Например: X5"
            readOnly={isLocked("car_model")}
            title={isLocked("car_model") ? "Заключено — модел на този автомобил" : undefined}
            className={inputClass("car_model")}
            {...register("car_model")}
          />
        </FormField>
      </div>

      <FormField
        id="saCarfaxMessage"
        label="Допълнителна информация"
        error={errors.message?.message}
      >
        <textarea
          id="saCarfaxMessage"
          placeholder="По желание: година, линк към обява, допълнителни детайли..."
          className="min-h-35 w-full resize-y appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 py-3.5 text-base font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,transform] duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none"
          {...register("message")}
        />
      </FormField>

      {status.kind !== "idle" && (
        <div
          className={
            status.kind === "success"
              ? "block rounded-[14px] border border-[#bfe2c8] bg-[#eef9f1] px-4 py-3.5 text-sm font-bold leading-[1.6] text-[#1e7a35]"
              : "block rounded-[14px] border border-[#f1c1bb] bg-[#fff3f2] px-4 py-3.5 text-sm font-bold leading-[1.6] text-[#b53b2f]"
          }
        >
          {status.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        rippleTheme="light"
        className="min-h-14.5 w-full rounded-[18px] border-0 bg-[linear-gradient(90deg,#b95200_0%,#d86f16_55%,#f08a1f_100%)] text-[17px] font-extrabold text-white shadow-[0_16px_30px_rgba(216,111,22,0.26)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
      >
        Изпрати запитването
      </Button>
    </form>
  );
}

