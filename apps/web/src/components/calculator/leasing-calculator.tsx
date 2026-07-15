"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";
import { annuityPayment, eur } from "@/lib/finance";
import { CalcField } from "./calc-field";
import { CalcGauge } from "./calc-gauge";
import { CalcResultRow } from "./calc-result-row";
import { CalcSlider } from "./calc-slider";
import { CalcTermSelect } from "./calc-term-select";

/**
 * Лизингов калкулатор — a standard amortizing-loan monthly-payment calculator.
 * Inputs: car price, down payment (slider + %-of-price presets), term, APR.
 * Outputs: monthly payment, loan amount, total interest, total paid, total cost.
 *
 * The math is a plain annuity (`lib/finance.annuityPayment`); verified against
 * the live selectauto.bg leasing tab (€35 000, 30% down, 60 mo, 6.5% → €479/mo).
 * NOT an offer — the disclaimer + „Кандидатствай" CTA route to a personal quote.
 */

const PRICE_MIN = 5_000;
const PRICE_MAX = 150_000;
const DOWN_PRESETS = [10, 15, 20, 30] as const;

export function LeasingCalculator() {
  const [price, setPrice] = useState(35_000);
  const [down, setDown] = useState(10_500); // 30% of the default price
  const [term, setTerm] = useState(60);
  const [apr, setApr] = useState(6.5);

  // Down payment can't exceed the price; clamp on read so a later price cut never
  // leaves a stale over-100% down payment financing a negative loan.
  const downClamped = Math.min(down, price);

  const r = useMemo(() => {
    const loan = Math.max(0, price - downClamped);
    const monthly = annuityPayment(loan, apr, term);
    const totalPaid = monthly * term;
    const interest = totalPaid - loan;
    const totalCost = totalPaid + downClamped;
    return { loan, monthly, totalPaid, interest, totalCost };
  }, [price, downClamped, apr, term]);

  const downPct = price > 0 ? Math.round((downClamped / price) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {/* Inputs */}
      <div className="flex flex-col gap-6 rounded-card border border-line bg-white p-6 shadow-card max-md:p-5">
        <div className="flex flex-col gap-3">
          <CalcField
            label="Цена на автомобила"
            hint="Ориентировъчна продажна цена на избрания автомобил."
            value={price}
            onChange={setPrice}
            prefix="€"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={500}
          />
          <CalcSlider
            ariaLabel="Цена на автомобила"
            value={price}
            onChange={setPrice}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={500}
          />
        </div>

        <div className="flex flex-col gap-3">
          <CalcField
            label="Първоначална вноска"
            hint="Сума, която плащате в началото."
            value={downClamped}
            onChange={setDown}
            prefix="€"
            min={0}
            max={price}
            step={100}
          />
          <CalcSlider
            ariaLabel="Първоначална вноска"
            value={downClamped}
            onChange={setDown}
            min={0}
            max={price}
            step={100}
            minLabel="€0"
            maxLabel="Макс"
          />
          <div className="grid grid-cols-4 gap-2">
            {DOWN_PRESETS.map((p) => {
              const active = downPct === p;
              return (
                <Button
                  key={p}
                  aria-pressed={active}
                  onClick={() => setDown(Math.round((price * p) / 100))}
                  rippleTheme="dark"
                  className={`rounded-xl border p-2 text-sm font-black transition-colors ${
                    active ? "border-brand bg-brand/10 text-brand-dark" : "border-line bg-white text-muted hover:border-brand/50"
                  }`}
                >
                  {p}%
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-extrabold text-ink">Срок</span>
            <CalcTermSelect value={term} onChange={setTerm} />
          </div>
          <div className="flex flex-col gap-3">
            <CalcField label="ГПР" hint="Лихвен процент" value={apr} onChange={setApr} suffix="%" min={1} max={30} step={0.1} />
            <CalcSlider
              ariaLabel="ГПР"
              value={apr}
              onChange={setApr}
              min={1}
              max={30}
              step={0.1}
              format={(n) => `${n}%`}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-col rounded-card border border-line bg-white p-6 shadow-card max-md:p-5">
        <h2 className="mb-4 text-2xl font-black text-ink">Обобщение</h2>
        <div className="mb-5 grid place-items-center">
          <CalcGauge fraction={0.82}>
            <div>
              <div className="text-[13px] text-muted">Месечно</div>
              <div className="text-3xl font-black tabular-nums text-ink">{eur(r.monthly)}</div>
              <div className="text-[13px] text-muted">лизингова вноска</div>
            </div>
          </CalcGauge>
        </div>

        <div>
          <CalcResultRow label="Сума на кредита" value={eur(r.loan)} />
          <CalcResultRow label="Общо лихва" value={eur(r.interest)} />
          <CalcResultRow label="Обща стойност на плащанията" value={eur(r.totalPaid)} />
          <CalcResultRow label="Общо разходи" value={eur(r.totalCost)} />
        </div>

        <InquiryButton
          rippleTheme="light"
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold uppercase tracking-wide text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Кандидатствай
        </InquiryButton>
        <p className="mt-3 text-[13px]/relaxed text-muted">
          Изчисленията са ориентировъчни. Реалната оферта зависи от автомобила, аванса, срока, одобрението и условията
          на финансиране.
        </p>
      </div>
    </div>
  );
}
