"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import type { ImportCostInputs } from "@/data/import-rates";
import { createCalculatorOffer } from "@/mutations/calculator-offers";
import {
  calculatorOfferContactSchema,
  type CalculatorOfferContactValues,
} from "@/schemas/calculator-offer.schema";

/**
 * The gated-offer lead form inside the estimator's result panel: name + phone +
 * email → the visitor receives the CURRENT breakdown as a branded email and the
 * lead lands in `calculator_offers` (docs/13-seo-action-plan.md Phase B).
 * Collapsed behind a button so the estimator stays a friction-free tool; the
 * form is the opt-in. Mirrors the carfax form's react-hook-form + zod pattern;
 * the server action recomputes the breakdown from `inputs`, so this form never
 * sends totals.
 */

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-brand";

export function CalculatorOfferForm({ inputs }: { inputs: ImportCostInputs }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CalculatorOfferContactValues>({
    resolver: zodResolver(calculatorOfferContactSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  async function onSubmit(values: CalculatorOfferContactValues) {
    setStatus({ kind: "idle" });
    try {
      const result = await createCalculatorOffer({
        ...values,
        inputs,
        page_url: window.location.href,
      });
      if (result.success) {
        setStatus({
          kind: "success",
          message: "Готово! Изпратихме разбивката на имейла Ви. Ще се свържем с Вас и по телефона.",
        });
        reset();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Грешка при изпращане. Моля опитайте отново." });
    }
  }

  if (status.kind === "success") {
    return (
      <p className="mt-4 rounded-xl bg-[#e8f5ec] px-4 py-3 text-sm font-semibold text-[#1d6b35]">
        {status.message}
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        rippleTheme="light"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-5 text-sm font-extrabold text-white transition-transform duration-200 hover:-translate-y-0.5"
      >
        Получи разбивката на имейл
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-2.5" noValidate>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        Получи тази разбивка на имейл
      </span>
      <input
        {...register("name")}
        placeholder="Име"
        autoComplete="name"
        className={INPUT_CLASS}
        aria-invalid={!!errors.name}
      />
      {errors.name ? <p className="text-xs font-semibold text-[#b3261e]">{errors.name.message}</p> : null}
      <input
        {...register("phone")}
        placeholder="Телефон (08…)"
        autoComplete="tel"
        inputMode="tel"
        className={INPUT_CLASS}
        aria-invalid={!!errors.phone}
      />
      {errors.phone ? <p className="text-xs font-semibold text-[#b3261e]">{errors.phone.message}</p> : null}
      <input
        {...register("email")}
        placeholder="Имейл"
        autoComplete="email"
        inputMode="email"
        className={INPUT_CLASS}
        aria-invalid={!!errors.email}
      />
      {errors.email ? <p className="text-xs font-semibold text-[#b3261e]">{errors.email.message}</p> : null}

      {status.kind === "error" ? (
        <p className="rounded-xl bg-[#fdecea] px-3 py-2 text-xs font-semibold text-[#b3261e]">
          {status.message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting}
        rippleTheme="light"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-5 text-sm font-extrabold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {isSubmitting ? "Изпращане…" : "Изпрати ми разбивката"}
      </Button>
      <p className="text-[11px]/relaxed text-muted">
        С изпращането се съгласявате да се свържем с Вас относно калкулацията.
      </p>
    </form>
  );
}
