/**
 * Pure vehicle-financing math shared by the two „Инструменти" calculators
 * (`/lizingov-kalkulator` and `/byudzheten-kalkulator`). No React, no
 * `"use client"` — plain functions so the same formulas run identically on the
 * server (for any future SSR of a result) and in the client islands, and stay
 * unit-testable.
 *
 * NOTE ON THE MODEL: these are standard time-value-of-money formulas, not the
 * live selectauto.bg calculator's numbers. That page's affordability figure does
 * not reconcile with any standard annuity/balloon formula (its displayed
 * loan/payment/residual are mutually inconsistent), so we deliberately do NOT
 * replicate it — we use correct, auditable math instead. Every output here can be
 * derived by hand from the inputs.
 */

/** Monthly interest rate from an annual percentage rate given in PERCENT (e.g. 6.5 → 0.005416…). */
export function monthlyRate(aprPercent: number): number {
  return aprPercent / 100 / 12;
}

/**
 * Fixed monthly payment that fully amortizes `principal` over `months` at the
 * given APR (standard amortizing loan — the leasing calculator). Falls back to a
 * flat `principal / months` when the rate is ~0 (avoids a 0/0), and returns 0 for
 * a non-positive principal or term.
 *
 *   M = P · r · (1+r)ⁿ / ((1+r)ⁿ − 1)
 */
export function annuityPayment(principal: number, aprPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRate(aprPercent);
  if (r <= 1e-9) return principal / months;
  const growth = Math.pow(1 + r, months);
  return (principal * r * growth) / (growth - 1);
}

/** The annuity present-value factor aₙ = (1 − (1+r)⁻ⁿ) / r (with the r→0 limit = n). */
function annuityFactor(r: number, months: number): number {
  if (r <= 1e-9) return months;
  return (1 - Math.pow(1 + r, -months)) / r;
}

/**
 * Inverse of the leasing math for the BUDGET (affordability) calculator: the
 * maximum car PRICE a buyer can finance for a target monthly `payment`, given a
 * down-payment fraction and an end-of-term residual (balloon) fraction of price.
 *
 * Financing model (balloon lease):
 *   • Down payment  D = downPct · P           (paid upfront)
 *   • Loan          L = P − D = (1 − downPct) · P
 *   • Residual      R = residualPct · P        (balloon due at month n)
 *   • The monthly payments amortize the loan down to the discounted residual:
 *       L = M · aₙ + R · (1+r)⁻ⁿ
 *
 * Substituting L and R and solving for P:
 *       P = M · aₙ / ( (1 − downPct) − residualPct · (1+r)⁻ⁿ )
 *
 * Returns 0 for a non-positive payment/term or a degenerate (≤0) denominator.
 */
export function affordablePrice({
  payment,
  aprPercent,
  months,
  downPct,
  residualPct,
}: {
  payment: number;
  aprPercent: number;
  months: number;
  downPct: number;
  residualPct: number;
}): number {
  if (payment <= 0 || months <= 0) return 0;
  const r = monthlyRate(aprPercent);
  const aN = annuityFactor(r, months);
  const discountedResidual = residualPct * Math.pow(1 + r, -months);
  const denom = 1 - downPct - discountedResidual;
  if (denom <= 1e-9) return 0;
  return (payment * aN) / denom;
}

/**
 * „12 345 €" — integer euros with thin-space thousands grouping, matching the
 * site's price formatting (see `calculator/cost-estimator.tsx`). Returns „—" for
 * non-finite / negative input so a mid-typing NaN never renders.
 */
export function eur(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} €`;
}
