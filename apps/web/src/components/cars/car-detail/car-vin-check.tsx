"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/common";
import { ShieldIcon } from "@/components/icons";

/**
 * Per-car VIN history check on /avtomobil/[id]. A one-click button that looks up how
 * many Carfax / AutoCheck records exist for THIS car's VIN, then routes the buyer to
 * the full (paid, manually-run) Carfax report — the same lead funnel as the standalone
 * /proverka-vin tool, minus the VIN input (the VIN is already known here).
 *
 * Posts the car's `vin` to `/api/vin-check`, which serves the answer from the durable
 * `vin_report_checks` read-through cache (so a popular car clicked by many visitors
 * costs the shared AuctionsAPI ~3 req/s budget at most once per TTL — see
 * lib/vin-report-cache.ts). Rendered only when the car has a VIN (gated by the page).
 */

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; vehicle: string | null; carfax: number; autocheck: number };

export function CarVinCheck({ vin }: { vin: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function runCheck() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/vin-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState({ kind: "error", message: data.message ?? "Проверката не бе успешна." });
        return;
      }
      setState({
        kind: "ok",
        vehicle: data.vehicle ?? null,
        carfax: data.carfax ?? 0,
        autocheck: data.autocheck ?? 0,
      });
    } catch {
      setState({ kind: "error", message: "Възникна грешка. Опитай отново." });
    }
  }

  const total = state.kind === "ok" ? state.carfax + state.autocheck : 0;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-dark">
          <ShieldIcon className="size-5" />
        </span>
        <h2 className="text-lg font-black uppercase tracking-tight text-ink">История по VIN</h2>
      </div>

      <p className="mb-4 text-sm/relaxed text-[#5a5d64]">
        Провери дали за този автомобил има налични Carfax / AutoCheck записи по неговия VIN номер.
      </p>

      {state.kind !== "ok" ? (
        <Button
          type="button"
          onClick={runCheck}
          disabled={state.kind === "loading"}
          rippleTheme="light"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 max-sm:w-full"
        >
          {state.kind === "loading" ? "Проверявам…" : "Провери историята"}
        </Button>
      ) : null}

      {state.kind === "error" ? (
        <p className="mt-3 text-sm font-semibold text-red-600">{state.message}</p>
      ) : null}

      {state.kind === "ok" ? (
        <div className="rounded-xl border border-line bg-[#fafafa] p-5">
          {state.vehicle ? <p className="mb-3 text-lg font-black text-ink">{state.vehicle}</p> : null}

          {total > 0 ? (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold text-brand-dark">
                  Carfax записи: {state.carfax}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold text-brand-dark">
                  AutoCheck записи: {state.autocheck}
                </span>
              </div>
              <p className="mb-4 text-sm/relaxed text-[#5a5d64]">
                За този автомобил има налична история. Заяви пълен Carfax доклад през SelectAuto — ще получиш
                подробния отчет (собственици, километри, инциденти, записи).
              </p>
              <LinkButton
                href="/carfax"
                rippleTheme="light"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Заяви пълен Carfax
              </LinkButton>
            </>
          ) : (
            <p className="text-sm/relaxed text-[#5a5d64]">
              За този VIN все още не са намерени Carfax или AutoCheck записи. Свържи се с нас за съдействие.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
