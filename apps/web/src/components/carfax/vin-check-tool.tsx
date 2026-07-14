"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Live VIN record-availability tool for /proverka-vin. Calls the server route
 * `/api/vin-check` (which wraps the FREE AuctionsAPI check-records lookup — the key
 * stays server-side). Shows how many Carfax / AutoCheck records exist for the VIN
 * plus the normalized vehicle name, then routes the user to the Carfax lead form
 * for the full (paid, manually-run) report. No paid call happens here.
 */

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; vin: string; vehicle: string | null; carfax: number; autocheck: number };

const INPUT_CLASS =
  "min-h-[54px] w-full appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 text-base font-semibold uppercase tracking-wide text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-200 placeholder:font-medium placeholder:normal-case placeholder:text-[#9aa0aa] focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none";

/** VIN format check mirrored from the server (17 chars, no I/O/Q) for instant UX. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function VinCheckTool() {
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });

  const trimmed = vin.trim().toUpperCase();
  const valid = VIN_RE.test(trimmed);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setResult({ kind: "error", message: "Въведи валиден 17-значен VIN номер (без I, O, Q)." });
      return;
    }
    setResult({ kind: "loading" });
    try {
      const res = await fetch("/api/vin-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vin: trimmed }),
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
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="vinCheckInput">
          VIN номер
        </label>
        <input
          id="vinCheckInput"
          name="vin"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          maxLength={17}
          autoComplete="off"
          spellCheck={false}
          placeholder="Въведи VIN номер (17 символа)"
          className={INPUT_CLASS}
        />
        <button
          type="submit"
          disabled={result.kind === "loading"}
          className="inline-flex min-h-13.5 shrink-0 items-center justify-center rounded-[14px] bg-brand px-7 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-px disabled:opacity-60 max-sm:w-full"
        >
          {result.kind === "loading" ? "Проверявам…" : "Провери"}
        </button>
      </form>

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
              <Link
                href="/carfax"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Заяви пълен Carfax
              </Link>
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
