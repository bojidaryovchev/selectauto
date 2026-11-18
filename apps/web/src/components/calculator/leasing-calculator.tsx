"use client";

import { useMemo, useState } from "react";
import { InquiryButton } from "@/components/inquiry";
import { annuityPayment, eur } from "@/lib/finance";
import { CalcBar } from "./calc-bar";
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
 * NOT an offer — the disclaimer + „Кандидатствайте" CTA route to a personal quote.
 *
 * Look (boards `im-leasing`, `im-leasing-states`, `im-fin-flow`; parity check docs/design/parity/lizingov-kalkulator.md):
 * the inputs in one panel, the summary in another beside it from 1024 px, and on a phone a bar with the monthly
 * payment and „Кандидатствайте" while the summary is off screen.
 */

const PRICE_MIN = 5_000;
const PRICE_MAX = 150_000;
const DOWN_PRESETS = [10, 15, 20, 30] as const;
/** The summary panel: the phone bar hides while it is on screen. */
const SUMMARY_ID = "leasing-summary";

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
    <>
      <div className="im-fin">
        {/* Inputs */}
        <div className="im-pnl">
          <div className="im-cfg">
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

          <div className="im-cfg">
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
            <div className="sa-seg im-seg" role="group" aria-label="Първоначална вноска">
              {DOWN_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={downPct === p}
                  onClick={() => setDown(Math.round((price * p) / 100))}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="im-cfrow">
            <div className="im-cfg">
              <span className="im-cf__l">Срок</span>
              <CalcTermSelect label="Срок" value={term} onChange={setTerm} />
            </div>
            <div className="im-cfg">
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
        <div id={SUMMARY_ID} className="im-pnl im-sum">
          <h2 className="im-pnl__h">Обобщение</h2>
          {/* The ring is a fixed decoration here (82 %), as today — design-run „съмнителен текст" 10. */}
          <CalcGauge fraction={0.82}>
            <span>Месечно</span>
            <b>{eur(r.monthly)}</b>
            <span>лизингова вноска</span>
          </CalcGauge>

          <div className="im-rows">
            <CalcResultRow label="Сума на кредита" value={eur(r.loan)} />
            <CalcResultRow label="Общо лихва" value={eur(r.interest)} />
            <CalcResultRow label="Обща стойност на плащанията" value={eur(r.totalPaid)} />
            <CalcResultRow label="Общо разходи" value={eur(r.totalCost)} />
          </div>

          <InquiryButton variant="pri" size="xl" block>
            Кандидатствайте
          </InquiryButton>
          <p className="im-small">
            Изчисленията са ориентировъчни. Реалната оферта зависи от автомобила, аванса, срока, одобрението и условията
            на финансиране.
          </p>
        </div>
      </div>

      {/* Phone: the monthly payment and „Кандидатствайте" stay in reach while the inputs scroll. */}
      <CalcBar watchIds={[SUMMARY_ID]}>
        <div>
          <small>Месечно</small>
          <b>{eur(r.monthly)}</b>
        </div>
        <InquiryButton variant="pri">Кандидатствайте</InquiryButton>
      </CalcBar>
    </>
  );
}
