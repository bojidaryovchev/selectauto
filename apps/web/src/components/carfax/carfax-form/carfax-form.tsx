"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { carfaxSchema, type CarfaxFormValues } from "@/schemas/carfax.schema";
import { normalizePhone } from "@/lib/phone";
import { FormField } from "./form-field";

/**
 * Carfax inquiry form. Ported 1:1 from the live `#saCarfaxForm`:
 * same fields, labels, placeholders and validation rules (name, phone and VIN
 * required; phone normalised; VIN upper-cased), but rebuilt on react-hook-form
 * + zod instead of the original vanilla `FormData` submit handler. Field-level
 * validation messages are surfaced inline, matching the repo's
 * `ConsultationForm` pattern, while the original single status box is kept for
 * the submit result.
 */

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const PAGE_URL =
  "https://selectauto.bg/carfax-%d0%b7%d0%b0%d1%8f%d0%b2%d0%ba%d0%b0/";

const INPUT_CLASS =
  "min-h-[54px] w-full appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 text-base font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,transform] duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none";

export function CarfaxForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CarfaxFormValues>({
    resolver: zodResolver(carfaxSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      vin: "",
      car_make: "",
      car_model: "",
      message: "",
    },
  });

  async function onSubmit(values: CarfaxFormValues) {
    const phone = normalizePhone(values.phone);
    const vin = values.vin.trim().toUpperCase();

    const payload = {
      ...values,
      phone,
      vin,
      page_url: PAGE_URL,
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
        reset();
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
    // Surface the first failing field's message in the status box. With every
    // required field empty this is the original "Моля попълнете..." message; a
    // filled-but-malformed VIN yields the original VIN-format message instead.
    const firstError =
      formErrors.full_name?.message ??
      formErrors.phone?.message ??
      formErrors.vin?.message ??
      "Моля попълнете име, телефон и VIN номер.";
    setStatus({ kind: "error", message: firstError });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="grid gap-3.5"
    >
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
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

      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <FormField id="saCarfaxEmail" label="Имейл" error={errors.email?.message}>
          <input
            id="saCarfaxEmail"
            type="email"
            placeholder="example@email.com"
            className={INPUT_CLASS}
            {...register("email")}
          />
        </FormField>

        <FormField id="saCarfaxVin" label="VIN номер" error={errors.vin?.message}>
          <input
            id="saCarfaxVin"
            type="text"
            placeholder="Например: 1HGCM82633A123456"
            required
            className={INPUT_CLASS}
            {...register("vin")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <FormField id="saCarfaxMake" label="Марка" error={errors.car_make?.message}>
          <input
            id="saCarfaxMake"
            type="text"
            placeholder="Например: BMW"
            className={INPUT_CLASS}
            {...register("car_make")}
          />
        </FormField>

        <FormField
          id="saCarfaxModel"
          label="Модел"
          error={errors.car_model?.message}
        >
          <input
            id="saCarfaxModel"
            type="text"
            placeholder="Например: X5"
            className={INPUT_CLASS}
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
          className="min-h-[140px] w-full resize-y appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 py-3.5 text-base font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,transform] duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none"
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[58px] w-full cursor-pointer rounded-[18px] border-0 bg-[linear-gradient(90deg,#b95200_0%,#d86f16_55%,#f08a1f_100%)] text-[17px] font-extrabold text-white shadow-[0_16px_30px_rgba(216,111,22,0.26)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Изпрати запитването
      </button>
    </form>
  );
}

