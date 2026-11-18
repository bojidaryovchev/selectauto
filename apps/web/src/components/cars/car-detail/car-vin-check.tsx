"use client";

import { useState } from "react";
import { Button } from "@/components/common";
import { CarfaxInquiryButton } from "@/components/carfax";
import { InfoIcon, ShieldCheckIcon, ShieldIcon } from "@/components/icons";

/** Where the Korean note points: the wrapper of the Encar sections on the car page. */
export const ENCAR_HISTORY_ID = "encar-history";

/**
 * Per-car VIN history check on /avtomobil/[id] (boards `cd-*`, `cd-f-vin`). A one-click button that looks up how many
 * Carfax / AutoCheck records exist for THIS car's VIN, then routes the buyer to the full (paid, manually-run) Carfax
 * report — the same lead funnel as the standalone /proverka-vin tool, minus the VIN input (the VIN is already known).
 *
 * Posts the car's `vin` to `/api/vin-check`, which serves the answer from the durable `vin_report_checks` read-through
 * cache (so a popular car clicked by many visitors costs the shared AuctionsAPI ~3 req/s budget at most once per TTL —
 * see lib/vin-report-cache.ts). Rendered only when the car has a VIN (gated by the page).
 *
 * „Заявете пълен Carfax" opens the in-page CarfaxDialog pre-filled + locked with this car's VIN (and make/model when
 * known) — same funnel as the contact panel's button, so the buyer never leaves the page.
 *
 * Korean cars add one line (owner decision 15): Carfax rarely has their records, so it points to the Encar history
 * further down the page (`encarHistory`, shown only when an Encar section renders).
 */

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; vehicle: string | null; carfax: number; autocheck: number };

export function CarVinCheck({
  vin,
  make,
  model,
  encarHistory = false,
}: {
  vin: string;
  make?: string;
  model?: string;
  /** A Korean car whose Encar history renders below: show the line pointing to it. */
  encarHistory?: boolean;
}) {
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
      setState({ kind: "error", message: "Възникна грешка. Опитайте отново." });
    }
  }

  const total = state.kind === "ok" ? state.carfax + state.autocheck : 0;

  return (
    <section className="sa-pnl cd-vin">
      <div className="cd-vin__h">
        <span className="sa-pnl__ic">
          <ShieldIcon />
        </span>
        <h2 className="sa-pnl__t">История по VIN</h2>
      </div>

      <p className="sa-p">Проверете дали за този автомобил има налични Carfax / AutoCheck записи по неговия VIN номер.</p>

      {encarHistory ? (
        <p className="cd-vinkr">
          <InfoIcon />
          <span>
            За автомобили от Корея Carfax рядко има записи — вижте <a href={`#${ENCAR_HISTORY_ID}`}>историята от Encar</a>{" "}
            <span className="whitespace-nowrap">по-долу</span> на страницата.
          </span>
        </p>
      ) : null}

      {state.kind !== "ok" ? (
        <Button variant="sec" onClick={runCheck} busy={state.kind === "loading"} disabled={state.kind === "loading"}>
          {state.kind === "loading" ? null : <ShieldCheckIcon />}
          {state.kind === "loading" ? "Проверявам…" : "Проверете историята"}
        </Button>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-sm font-semibold text-neg">
          {state.message}
        </p>
      ) : null}

      {state.kind === "ok" ? (
        <div className="cd-vinres">
          {state.vehicle ? <p className="cd-vinres__v">{state.vehicle}</p> : null}

          {total > 0 ? (
            <>
              <div className="sa-row">
                <span className="sa-tag sa-tag--info sa-tag--lg">Carfax записи: {state.carfax}</span>
                <span className="sa-tag sa-tag--info sa-tag--lg">AutoCheck записи: {state.autocheck}</span>
              </div>
              <p className="sa-small">
                За този автомобил има налична история. Заявете пълен Carfax доклад през SelectAuto — ще получите
                подробния отчет (собственици, километри, инциденти, записи).
              </p>
              <CarfaxInquiryButton vin={vin} make={make} model={model} variant="pri">
                <ShieldCheckIcon />
                Заявете пълен Carfax
              </CarfaxInquiryButton>
            </>
          ) : (
            <p className="sa-small">
              За този VIN все още не са намерени Carfax или AutoCheck записи. Свържете се с нас за съдействие.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
