"use client";

import { useMemo, useState } from "react";
import { LinkButton } from "@/components/common";
import { bgDecimal } from "@/data/import-rates";
import { affordablePrice, eur } from "@/lib/finance";
import { CalcBar } from "./calc-bar";
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
 *
 * Look (boards `im-budget`, `im-budget-states`, `im-fin-flow`; parity check docs/design/parity/byudzheten-kalkulator.md):
 * the inputs in one panel, the result in another beside it from 1024 px, and on a phone a bar with the price range
 * while the result is off screen.
 */

const APR = 5.5; // прогнозен ГПР
const DOWN_PCT = 0.1; // първоначална вноска като дял от цената
const RESIDUAL_PCT = 0.2; // остатъчна стойност (балон) като дял от цената
const RANGE_SPREAD = 0.05; // ±5% около прогнозната цена → показан диапазон

const PAY_MIN = 100;
const PAY_MAX = 5_000;
/** The result panel: the phone bar hides while it is on screen. */
const SUMMARY_ID = "budget-summary";

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
  const range = `${eur(r.low)} – ${eur(r.high)}`;

  return (
    <>
      <div className="im-fin">
        {/* Inputs */}
        <div className="im-pnl">
          <h2 className="im-pnl__h">Нека пресметнем.</h2>

          <div className="im-cfrow">
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

          <div className="im-pay">
            <div className="im-pay__top">
              <div>
                <b>Желана месечна вноска</b>
                <span>Колко искате да плащате?</span>
              </div>
              <div className="im-pay__v">
                <i>€</i>
                <b>{payment.toLocaleString("bg-BG")}</b>
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

          <div className="im-cfg">
            <span className="im-cf__l">Срок на лизинг (месеци)</span>
            <CalcTermSelect label="Срок на лизинг (месеци)" value={term} onChange={setTerm} />
          </div>
        </div>

        {/* Summary */}
        <div id={SUMMARY_ID} className="im-pnl im-sum">
          <CalcGauge fraction={r.impact}>
            <span>Влияние върху бюджета</span>
            <b>{impactPct}%</b>
            <span>от месечния доход</span>
          </CalcGauge>

          <div className="im-afford">
            <span>Можете да си позволите кола до</span>
            <b>{range}</b>
          </div>

          <div className="im-rows im-rows--inset">
            <CalcResultRow label="Прогнозен ГПР" value={`${bgDecimal(APR)}%`} />
            <CalcResultRow label="Първоначална вноска (прогнозна)" value={eur(r.down)} />
            <CalcResultRow label="Остатъчна стойност" value={eur(r.residual)} />
            <CalcResultRow label="Обща сума на кредита" value={eur(r.loan)} />
            <CalcResultRow label="Свободен доход след разходи" value={eur(r.freeIncome)} />
          </div>

          <LinkButton href={catalogHref} variant="pri" size="xl" block>
            Вижте автомобили в този бюджет
          </LinkButton>
          <p className="im-small">
            Изчисленията са ориентировъчни и не представляват оферта за кредит. Реалните условия могат да варират според
            профила на клиента, срока и избрания автомобил.
          </p>
        </div>
      </div>

      {/* Phone: the price range stays in view while the inputs scroll. */}
      <CalcBar watchId={SUMMARY_ID}>
        <div>
          <small>Можете да си позволите кола до</small>
          <b>{range}</b>
        </div>
      </CalcBar>
    </>
  );
}
