"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { CarfaxInquiryButton } from "@/components/carfax/carfax-dialog";
import { AlertIcon, InfoIcon, SearchIcon, ShieldCheckIcon, TimerIcon } from "@/components/icons";
import { vinCheckSchema, type VinCheckValues } from "@/schemas/vin-check.schema";

/**
 * Live VIN record-availability tool for /proverka-vin (boards `in-vin`, `in-vin-flow`, `in-vin-msgs`). Calls the
 * server route `/api/vin-check` (which wraps the FREE AuctionsAPI check-records lookup — the key stays server-side).
 * Shows how many Carfax / AutoCheck records exist for the VIN plus the normalized vehicle name, then routes the user
 * to the Carfax lead form for the full (paid, manually-run) report. No paid call happens here.
 *
 * The VIN field is validated with react-hook-form + `zodResolver(vinCheckSchema)` — the SAME schema the
 * `/api/vin-check` route validates against, so the instant client check and the server guard can never drift.
 * While it checks, the button reads „Проверявам…" and a placeholder stands where the result will be; with records
 * found, „Заявете пълен Carfax" becomes the primary action and „Проверете" turns secondary. Too many requests (429)
 * shows a warning, every other failure an error.
 */

type Result =
  | { kind: "idle" }
  | { kind: "error"; message: string; tooMany: boolean }
  | { kind: "ok"; vin: string; vehicle: string | null; carfax: number; autocheck: number };

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
        setResult({ kind: "error", message: data.message ?? "Проверката не бе успешна.", tooMany: res.status === 429 });
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
      setResult({ kind: "error", message: "Възникна грешка. Опитайте отново.", tooMany: false });
    }
  }

  const total = result.kind === "ok" ? result.carfax + result.autocheck : 0;
  const fieldError = errors.vin?.message;

  return (
    <div className="sa-pnl in-tool">
      <form
        noValidate
        // Clear any stale lookup result when the VIN fails client validation, so a
        // previous "ok" card doesn't linger next to the new inline field error.
        onSubmit={handleSubmit(onValid, () => setResult({ kind: "idle" }))}
        className="in-tool__f items-start"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 max-sm:w-full">
          <span className="sa-inw">
            <SearchIcon />
            <input
              id="vinCheckInput"
              aria-label="VIN номер"
              maxLength={17}
              autoComplete="off"
              spellCheck={false}
              placeholder="Въведете VIN номер (17 символа)"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "vinCheckInput-err" : undefined}
              className={`sa-in in-vin ${fieldError ? "is-err" : ""}`}
              {...register("vin")}
            />
          </span>
          {fieldError ? (
            <span id="vinCheckInput-err" className="sa-err">
              <AlertIcon />
              {fieldError}
            </span>
          ) : null}
        </div>
        <Button
          type="submit"
          variant={total > 0 ? "sec" : "pri"}
          size="xl"
          busy={isSubmitting}
          disabled={isSubmitting}
          className="opacity-100"
        >
          {isSubmitting ? "Проверявам…" : "Проверете"}
        </Button>
      </form>

      {isSubmitting ? (
        <div className="sa-pnl sa-pnl--s2 in-res" aria-busy="true" aria-label="Зареждане">
          <span className="sa-sk in-sk3 h-4.5 w-[70%]" />
          <div className="in-res__s">
            <span className="sa-sk in-sk3 h-9 w-37.5 rounded-full" />
            <span className="sa-sk in-sk3 h-9 w-44 rounded-full" />
          </div>
          <span className="sa-sk in-sk3 h-3 w-[95%]" />
          <span className="sa-sk in-sk3 h-3 w-[80%]" />
        </div>
      ) : null}

      {result.kind === "error" ? (
        <div className={`sa-alert ${result.tooMany ? "sa-alert--warn" : "sa-alert--neg"}`} role="alert">
          {result.tooMany ? <TimerIcon /> : <AlertIcon />}
          <div>
            <b>{result.message}</b>
          </div>
        </div>
      ) : null}

      {result.kind === "ok" ? (
        <div className="sa-pnl sa-pnl--s2 in-res" role="status">
          <h2 className="in-res__t">{result.vehicle ?? `VIN: ${result.vin}`}</h2>
          {total > 0 ? (
            <>
              <div className="in-res__s">
                <span className="in-cnt">
                  Carfax записи: <b>{result.carfax}</b>
                </span>
                <span className="in-cnt">
                  AutoCheck записи: <b>{result.autocheck}</b>
                </span>
              </div>
              <p className="sa-small">
                За този автомобил има налична история. Заявете пълен Carfax доклад през SelectAuto — ще получите
                подробния отчет (собственици, километри, инциденти, записи).
              </p>
              <CarfaxInquiryButton vin={result.vin} variant="pri" block>
                <ShieldCheckIcon />
                Заявете пълен Carfax
              </CarfaxInquiryButton>
            </>
          ) : (
            <div className="sa-alert sa-alert--info bg-s3">
              <InfoIcon />
              <p>
                За този VIN не са намерени Carfax или AutoCheck записи. Проверете номера или се свържете с нас за
                съдействие.
              </p>
            </div>
          )}
        </div>
      ) : null}

      <p className="sa-hint">
        Проверката показва наличността на записи (Carfax / AutoCheck) за въведения VIN. Пълният доклад се заявява
        през SelectAuto.
      </p>
    </div>
  );
}
