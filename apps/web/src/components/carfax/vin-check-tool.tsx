"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { CarfaxInquiryButton } from "@/components/carfax/carfax-dialog";
import { vinCheckSchema, type VinCheckValues } from "@/schemas/vin-check.schema";

/**
 * Live VIN record-availability tool for /proverka-vin. Calls the server route
 * `/api/vin-check` (which wraps the FREE AuctionsAPI check-records lookup — the key
 * stays server-side). Shows how many Carfax / AutoCheck records exist for the VIN
 * plus the normalized vehicle name, then routes the user to the Carfax lead form
 * for the full (paid, manually-run) report. No paid call happens here.
 *
 * The VIN field is validated with react-hook-form + `zodResolver(vinCheckSchema)`
 * — the SAME schema the `/api/vin-check` route validates against, so the instant
 * client check and the server guard can never drift. Field-level format errors
 * surface inline; `result` holds the async lookup outcome (network / API).
 */

type Result =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ok"; vin: string; vehicle: string | null; carfax: number; autocheck: number };

const INPUT_CLASS =
  "min-h-[54px] w-full appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 text-base font-semibold uppercase tracking-wide text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-200 placeholder:font-medium placeholder:normal-case placeholder:text-[#9aa0aa] focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none";

export function VinCheckTool() {
  const [result, setResult] = useState<Result>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VinCheckValues>({
    resolver: zodResolver(vinCheckSchema),
    defaultValues: { vin: "" },
  });

  // `values.vin` is already trimmed + upper-cased by the schema.
  async function onValid({ vin }: VinCheckValues) {
    setResult({ kind: "idle" });
    try {
      const res = await fetch("/api/vin-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResult({ kind: "error", message: data.message ?? "Проверката не бе успешна." });
        return;
      }
      setResult({
        kind: "ok",
        vin: data.vin,
        vehicle: data.vehicle ?? null,
        carfax: data.carfax ?? 0,
        autocheck: data.autocheck ?? 0,
      });
    } catch {
      setResult({ kind: "error", message: "Възникна грешка. Опитай отново." });
    }
  }

  const total = result.kind === "ok" ? result.carfax + result.autocheck : 0;

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <form
        noValidate
        // Clear any stale lookup result when the VIN fails client validation, so a
        // previous "ok" card doesn't linger next to the new inline field error.
        onSubmit={handleSubmit(onValid, () => setResult({ kind: "idle" }))}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label className="sr-only" htmlFor="vinCheckInput">
          VIN номер
        </label>
        <input
          id="vinCheckInput"
          maxLength={17}
          autoComplete="off"
          spellCheck={false}
          placeholder="Въведи VIN номер (17 символа)"
          className={INPUT_CLASS}
          {...register("vin")}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          rippleTheme="light"
          className="inline-flex min-h-13.5 shrink-0 items-center justify-center rounded-[14px] bg-brand px-7 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-px disabled:opacity-60 max-sm:w-full"
        >
          {isSubmitting ? "Проверявам…" : "Провери"}
        </Button>
      </form>

      {errors.vin?.message ? (
        <p className="mt-3 text-sm font-semibold text-red-600">{errors.vin.message}</p>
      ) : null}

      {result.kind === "error" ? <p className="mt-3 text-sm font-semibold text-red-600">{result.message}</p> : null}

      {result.kind === "ok" ? (
        <div className="mt-5 rounded-xl border border-line bg-[#fafafa] p-5">
          {result.vehicle ? (
            <p className="mb-3 text-lg font-black text-ink">{result.vehicle}</p>
          ) : (
            <p className="mb-3 text-lg font-black text-ink">VIN: {result.vin}</p>
          )}

          {total > 0 ? (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold text-brand-dark">
                  Carfax записи: {result.carfax}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold text-brand-dark">
                  AutoCheck записи: {result.autocheck}
                </span>
              </div>
              <p className="mb-4 text-sm/relaxed text-[#5a5d64]">
                За този автомобил има налична история. Заяви пълен Carfax доклад през SelectAuto — ще получиш
                подробния отчет (собственици, километри, инциденти, записи).
              </p>
              <CarfaxInquiryButton
                vin={result.vin}
                rippleTheme="light"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Заяви пълен Carfax
              </CarfaxInquiryButton>
            </>
          ) : (
            <p className="text-sm/relaxed text-[#5a5d64]">
              За този VIN не са намерени Carfax или AutoCheck записи. Провери номера или се свържи с нас за
              съдействие.
            </p>
          )}
        </div>
      ) : null}

      <p className="mt-4 text-xs/relaxed text-muted">
        Проверката показва наличността на записи (Carfax / AutoCheck) за въведения VIN. Пълният доклад се заявява
        през SelectAuto.
      </p>
    </div>
  );
}
