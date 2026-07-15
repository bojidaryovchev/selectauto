"use client";

import { useMemo, useState } from "react";
import { LinkButton } from "@/components/common";
import { affordablePrice, eur } from "@/lib/finance";
import { CalcField } from "./calc-field";
import { CalcGauge } from "./calc-gauge";
import { CalcResultRow } from "./calc-result-row";
import { CalcSlider } from "./calc-slider";
import { CalcTermSelect } from "./calc-term-select";

/**
 * Бюджетен калкулатор — an affordability tool. From a target monthly payment,
 * term, income and expenses it estimates the car PRICE the buyer can finance
 * (via `lib/finance.affordablePrice`, a balloon-lease present-value solve) and
 * surfaces the budget impact + a „see cars in this budget" deep link into the
 * catalog (`?price_max=`).
 *
 * The financing assumptions below are editable defaults presented transparently
 * (shown as „Прогнозен ГПР" etc.), not guarantees — the disclaimer says the real
 * offer depends on the client profile. See `finance.ts` on why we use correct
 * balloon math rather than the live site's non-reconciling figures.
 */

const APR = 5.5; // прогнозен ГПР
const DOWN_PCT = 0.1; // първоначална вноска като дял от цената
const RESIDUAL_PCT = 0.2; // остатъчна стойност (балон) като дял от цената
const RANGE_SPREAD = 0.05; // ±5% около прогнозната цена → показан диапазон

const PAY_MIN = 100;
const PAY_MAX = 5_000;

export function BudgetCalculator() {
  const [income, setIncome] = useState(4_500);
  const [expenses, setExpenses] = useState(2_100);
  const [payment, setPayment] = useState(1_000);
  const [term, setTerm] = useState(60);

  const r = useMemo(() => {
    const price = affordablePrice({
      payment,
      aprPercent: APR,
      months: term,
      downPct: DOWN_PCT,
      residualPct: RESIDUAL_PCT,
    });
    const low = price * (1 - RANGE_SPREAD);
    const high = price * (1 + RANGE_SPREAD);
    return {
      price,
      low,
      high,
      down: price * DOWN_PCT,
      residual: price * RESIDUAL_PCT,
      loan: price * (1 - DOWN_PCT),
      freeIncome: income - expenses,
      impact: income > 0 ? payment / income : 0,
    };
  }, [payment, term, income, expenses]);

  const impactPct = Math.round(r.impact * 100);
  const catalogHref = r.high > 0 ? `/vsichki-avtomobili?price_max=${Math.round(r.high)}` : "/vsichki-avtomobili";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {/* Inputs */}
      <div className="flex flex-col gap-6 rounded-card border border-line bg-white p-6 shadow-card max-md:p-5">
        <h2 className="text-2xl font-black text-ink">Нека пресметнем.</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <CalcField
            label="Месечен нетен доход"
            hint="Вашият доход след данъци."
            value={income}
            onChange={setIncome}
            prefix="€"
            step={100}
          />
          <CalcField
            label="Месечни задължения и разходи"
            hint="Наем, кредити, храна, сметки и др."
            value={expenses}
            onChange={setExpenses}
            prefix="€"
            step={100}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-[#faf7f3] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[15px] font-extrabold text-ink">Желана месечна вноска</div>
              <div className="text-[13px] text-muted">Колко искате да плащате?</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5">
              <span className="text-lg font-black text-brand">€</span>
              <span className="text-2xl font-black tabular-nums text-ink">{payment.toLocaleString("bg-BG")}</span>
            </div>
          </div>
          <CalcSlider
            ariaLabel="Желана месечна вноска"
            value={payment}
            onChange={setPayment}
            min={PAY_MIN}
            max={PAY_MAX}
            step={50}
            minLabel="€100"
            maxLabel="€5000+"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-extrabold text-ink">Срок на лизинг (месеци)</span>
          <CalcTermSelect value={term} onChange={setTerm} />
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-col rounded-card border border-line bg-white p-6 shadow-card max-md:p-5">
        <div className="mb-5 grid place-items-center">
          <CalcGauge fraction={r.impact}>
            <div>
              <div className="text-[13px] text-muted">Влияние върху бюджета</div>
              <div className="text-4xl font-black tabular-nums text-brand">{impactPct}%</div>
              <div className="text-[13px] text-muted">от месечния доход</div>
            </div>
          </CalcGauge>
        </div>

        <div className="mb-5 text-center">
          <div className="text-[13px] font-black uppercase tracking-wide text-muted">Можете да си позволите кола до</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-brand max-md:text-xl">
            {eur(r.low)} – {eur(r.high)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#faf7f3] p-5">
          <CalcResultRow label="Прогнозен ГПР" value={`${APR}%`} />
          <CalcResultRow label="Първоначална вноска (прогнозна)" value={eur(r.down)} />
          <CalcResultRow label="Остатъчна стойност" value={eur(r.residual)} />
          <CalcResultRow label="Обща сума на кредита" value={eur(r.loan)} />
          <CalcResultRow label="Свободен доход след разходи" value={eur(r.freeIncome)} />
        </div>

        <LinkButton
          href={catalogHref}
          rippleTheme="light"
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-6 text-center text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Виж автомобили в този бюджет
        </LinkButton>
        <p className="mt-3 text-[13px]/relaxed text-muted">
          Изчисленията са ориентировъчни и не представляват оферта за кредит. Реалните условия могат да варират според
          профила на клиента, срока и избрания автомобил.
        </p>
      </div>
    </div>
  );
}
