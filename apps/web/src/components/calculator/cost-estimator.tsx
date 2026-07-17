"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/common";
import {
  AGE_BANDS,
  type AgeBand,
  computeImportBreakdown,
  DEFAULT_CUSTOMS_BASE_PCT,
  EUR_BGN,
  FUEL_KINDS,
  type FuelKind,
  type ImportCostInputs,
  MARKETS,
  type MarketId,
  RATES_VERIFIED_AT,
} from "@/data/import-rates";
import { CalculatorOfferForm } from "./calculator-offer-form";

/**
 * Import-cost calculator v2 (docs/13-seo-action-plan.md Phase B). Upgrades the
 * Phase-0 estimator with the researched, market-correct cost model:
 *
 *  - Duty is DERIVED, not a free % field: Korea 0% only with the approved-
 *    exporter origin declaration (EU–KR FTA toggle, default OFF = conservative
 *    10%); USA/Canada 10% MFN (CETA's 0% needs Canadian ORIGIN — rare on
 *    auction lots, handled via a personal offer).
 *  - Itemized: екотакса by fuel + age band (ПМС 76/2016), одобряване/технотест/
 *    адаптация (higher default for US/CA — lights/km-h speedometer), ГТП + КАТ.
 *  - Honest 2026 transit times per market + a „ставките са проверени към" stamp.
 *  - BGN dual display of the total at the fixed 1.95583 rate.
 *  - Gated lead capture: „Получи разбивката на имейл" (CalculatorOfferForm) —
 *    the server action recomputes this same breakdown from the raw inputs.
 *
 * All rates/defaults live in `data/import-rates.ts` (one file to update on the
 * quarterly re-verification). Still NOT an offer — the disclaimer stands.
 */

/** "12 345 €" thin-space grouping, matching the site's price formatting. */
function eur(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} €`;
}

/** A label/value breakdown row. Module-scoped (not defined during render) so
 *  React doesn't remount it each render — react-hooks/static-components. */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className={`text-sm ${muted ? "text-muted" : "text-[#5a5d64]"}`}>{label}</span>
      <span className="text-sm font-bold text-ink tabular-nums">{value}</span>
    </div>
  );
}

/** A numeric input field. Module-scoped — critical here because it holds an
 *  `<input>`: a render-time component definition would remount the input every
 *  keystroke and lose focus/caret. */
function NumberField({
  label,
  value,
  onChange,
  step = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-brand"
      />
    </label>
  );
}

/** A styled <select>. Module-scoped for the same focus-preservation reason. */
function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-brand"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * `defaultMarket` presets the market control (a country hub embeds the
 * estimator pre-set to its own market); `defaultPrice` presets the car price
 * (the car-detail „Калкулирай вноса" deep link). Both are initial values, not
 * locks — the estimator stays a general tool wherever it's embedded.
 */
export function CostEstimator({
  defaultMarket = "kr",
  defaultPrice,
}: { defaultMarket?: MarketId; defaultPrice?: number } = {}) {
  const initial = MARKETS.find((m) => m.id === defaultMarket) ?? MARKETS[0];

  const [market, setMarket] = useState<MarketId>(initial.id);
  const [price, setPrice] = useState(defaultPrice && defaultPrice > 0 ? defaultPrice : 15000);
  const [auctionFees, setAuctionFees] = useState<number>(initial.auctionFees);
  const [transport, setTransport] = useState<number>(initial.transport);
  const [approval, setApproval] = useState<number>(initial.approval);
  const [registration, setRegistration] = useState<number>(initial.registration);
  const [fuel, setFuel] = useState<FuelKind>("ice");
  const [age, setAge] = useState<AgeBand>("upTo5");
  // Declared customs value as a % of CIF (the base for duty + VAT). Defaults to
  // the full 100% (legally correct); editable for a documented lower valuation.
  const [customsBasePct, setCustomsBasePct] = useState<number>(DEFAULT_CUSTOMS_BASE_PCT);
  // Conservative default: WITHOUT the origin declaration Korea pays the full
  // 10% — the toggle (and its copy) is the differentiator explanation.
  const [originDeclaration, setOriginDeclaration] = useState(false);

  const activeMarket = MARKETS.find((m) => m.id === market)!;

  /** Switching market resets the market-priced fields to that market's defaults
   *  (predictable), while the car-specific inputs (price, fuel, age) persist. */
  function switchMarket(id: MarketId) {
    const cfg = MARKETS.find((m) => m.id === id)!;
    setMarket(id);
    setAuctionFees(cfg.auctionFees);
    setTransport(cfg.transport);
    setApproval(cfg.approval);
    setRegistration(cfg.registration);
  }

  const inputs: ImportCostInputs = useMemo(
    () => ({
      market,
      priceEur: price,
      auctionFeesEur: auctionFees,
      transportEur: transport,
      approvalEur: approval,
      registrationEur: registration,
      fuel,
      age,
      originDeclaration,
      customsBasePct,
    }),
    [
      market,
      price,
      auctionFees,
      transport,
      approval,
      registration,
      fuel,
      age,
      originDeclaration,
      customsBasePct,
    ],
  );

  const b = useMemo(() => computeImportBreakdown(inputs), [inputs]);

  return (
    <div className="grid grid-cols-1 gap-6 rounded-card border border-line bg-white p-6 shadow-card lg:grid-cols-[1fr_1fr] max-md:p-5">
      {/* Inputs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Пазар</span>
          <div className="flex gap-2">
            {MARKETS.map((m) => (
              <Button
                key={m.id}
                onClick={() => switchMarket(m.id)}
                rippleTheme="dark"
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                  market === m.id
                    ? "border-brand bg-brand/10 text-brand-dark"
                    : "border-line bg-white text-[#5a5d64] hover:border-brand/50"
                }`}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        <NumberField label="Цена на автомобила (€)" value={price} onChange={setPrice} step={500} />

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Гориво" value={fuel} onChange={setFuel} options={FUEL_KINDS.slice()} />
          <SelectField label="Възраст" value={age} onChange={setAge} options={AGE_BANDS.slice()} />
        </div>

        {/* Korea duty toggle — the EU–KR FTA origin-declaration nuance most
            competitors get wrong: 0% ONLY with an approved-exporter declaration. */}
        {activeMarket.originToggle ? (
          <label className="flex items-start gap-2.5 rounded-xl border border-line bg-[#f7f7f8] p-3">
            <input
              type="checkbox"
              checked={originDeclaration}
              onChange={(e) => setOriginDeclaration(e.target.checked)}
              className="mt-0.5 size-4 accent-brand"
            />
            <span className="text-[13px]/relaxed text-[#3d4046]">
              <strong>Декларация за произход от одобрен износител</strong> — при внос от
              Корея митото е <strong>0% вместо 10%</strong>, когато корейският износител
              издаде декларация за преференциален произход (Споразумението ЕС–Корея).
              Без нея се дължи пълното мито.
            </span>
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Аукционни такси (€)" value={auctionFees} onChange={setAuctionFees} />
          <NumberField label="Транспорт (€)" value={transport} onChange={setTransport} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Одобряване и адаптация (€)"
            value={approval}
            onChange={setApproval}
            step={50}
          />
          <NumberField
            label="Регистрация (€)"
            value={registration}
            onChange={setRegistration}
            step={10}
          />
        </div>
        <div className="flex flex-col gap-1">
          <NumberField
            label="Митническа основа (% от стойността)"
            value={customsBasePct}
            onChange={(v) => setCustomsBasePct(Math.min(100, Math.max(1, v)))}
            step={5}
          />
          <span className="text-[11px]/relaxed text-muted">
            Процент от стойността, върху който се начисляват мито и ДДС. По
            подразбиране 100% (пълната стойност). Променете само при документирано
            основание за по-ниска митническа стойност.
          </span>
        </div>

        <p className="text-xs/relaxed text-muted">
          Митото ({b.dutyPctApplied}%) и ДДС (20%) се изчисляват автоматично върху
          митническата основа ({b.customsBasePctApplied}% от стойността до
          България); екотаксата — по гориво и възраст (ПУДООС). Ставките са
          проверени към {RATES_VERIFIED_AT}.
        </p>
      </div>

      {/* Result */}
      <div className="flex flex-col rounded-[18px] bg-[#f7f7f8] p-5">
        <span className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Ориентировъчна разбивка
        </span>
        {b.lines.map((l) => (
          <Row key={l.label} label={l.label} value={eur(l.amountEur)} />
        ))}
        {b.customsBasePctApplied < 100 ? (
          <Row
            muted
            label={`Митническа основа (${b.customsBasePctApplied}%)`}
            value={eur(b.customsValueEur)}
          />
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[#2f343c] px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Общо (ориентир)
          </span>
          <span className="text-right">
            <span className="block text-xl font-black text-white tabular-nums">{eur(b.totalEur)}</span>
            <span className="block text-xs font-semibold text-white/60 tabular-nums">
              ≈ {Math.round(b.totalEur * EUR_BGN).toLocaleString("bg-BG").replace(/ /g, " ")} лв.
            </span>
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold text-[#3d4046]">
          Ориентировъчен срок за доставка: {activeMarket.transit}
        </p>
        <p className="mt-2 text-xs/relaxed text-muted">
          Това е ориентировъчна оценка по зададените от Вас стойности и НЕ е оферта.
          Точните мита, ДДС, такси и транспорт зависят от конкретния автомобил и
          текущите тарифи.
        </p>

        {/* Gated offer: email me this breakdown (lead capture). */}
        <CalculatorOfferForm inputs={inputs} />
      </div>
    </div>
  );
}
