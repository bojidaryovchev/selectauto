"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/common";

/**
 * A transparent, adjustable import-cost estimator. NOT an authoritative quote —
 * it sums the cost components a buyer should expect and lets them tune the
 * defaults, with a prominent disclaimer. The exact figure comes from a personal
 * offer (the page's CTA opens the inquiry modal). This is the Phase-0 version of
 * docs/12-web-seo-strategy.md's "import-cost calculator" lead asset; the advanced
 * multi-country itemized calculator with a gated PDF is a Phase-1 upgrade.
 *
 * Defaults reflect the typical structure of a third-country (non-EU) vehicle
 * import into Bulgaria: customs duty + VAT on the landed value, plus auction
 * fees, transport and local registration. Rates are editable defaults the user
 * can adjust — we don't present them as guaranteed.
 */

const MARKETS = [
  { id: "kr", label: "Корея", transport: 1800 },
  { id: "us", label: "САЩ", transport: 2200 },
  { id: "ca", label: "Канада", transport: 2300 },
] as const;

type MarketId = (typeof MARKETS)[number]["id"];

/** "12 345 €" thin-space grouping, matching the site's price formatting. */
function eur(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} €`;
}

/** A label/value breakdown row. Module-scoped (not defined during render) so
 *  React doesn't remount it each render — react-hooks/static-components. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-sm text-[#5a5d64]">{label}</span>
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
  suffix,
  step = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-brand"
        />
        {suffix ? <span className="text-sm font-semibold text-muted">{suffix}</span> : null}
      </div>
    </label>
  );
}

/**
 * `defaultMarket` presets the market segmented control (e.g. a country hub embeds
 * the estimator pre-set to its own market). Defaults to Korea, matching the prior
 * hardcoded value. The user can still switch markets — it's an initial value, not a
 * lock, so the estimator stays a general tool wherever it's embedded.
 */
export function CostEstimator({ defaultMarket = "kr" }: { defaultMarket?: MarketId } = {}) {
  const [market, setMarket] = useState<MarketId>(defaultMarket);
  const [price, setPrice] = useState(15000);
  const [auctionFees, setAuctionFees] = useState(900);
  const [dutyPct, setDutyPct] = useState(10); // typical third-country car duty
  const [vatPct, setVatPct] = useState(20); // BG VAT
  const [registration, setRegistration] = useState(600);

  const activeMarket = MARKETS.find((m) => m.id === market)!;
  const transport = activeMarket.transport;

  const breakdown = useMemo(() => {
    const landed = price + auctionFees + transport; // value the duty is assessed on
    const duty = (landed * dutyPct) / 100;
    const vat = ((landed + duty) * vatPct) / 100; // VAT on landed value + duty
    const total = landed + duty + vat + registration;
    return { landed, duty, vat, total };
  }, [price, auctionFees, transport, dutyPct, vatPct, registration]);

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
                onClick={() => setMarket(m.id)}
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
        <NumberField label="Аукционни такси (€)" value={auctionFees} onChange={setAuctionFees} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Мито" value={dutyPct} onChange={setDutyPct} suffix="%" step={1} />
          <NumberField label="ДДС" value={vatPct} onChange={setVatPct} suffix="%" step={1} />
        </div>
        <NumberField label="Регистрация и такси (€)" value={registration} onChange={setRegistration} />
      </div>

      {/* Result */}
      <div className="flex flex-col rounded-[18px] bg-[#f7f7f8] p-5">
        <span className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Ориентировъчна разбивка</span>
        <Row label={`Транспорт (${activeMarket.label})`} value={eur(transport)} />
        <Row label="Стойност до България" value={eur(breakdown.landed)} />
        <Row label={`Мито (${dutyPct}%)`} value={eur(breakdown.duty)} />
        <Row label={`ДДС (${vatPct}%)`} value={eur(breakdown.vat)} />
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[#2f343c] px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">Общо (ориентир)</span>
          <span className="text-xl font-black text-white tabular-nums">{eur(breakdown.total)}</span>
        </div>
        <p className="mt-3 text-xs/relaxed text-muted">
          Това е ориентировъчна оценка по зададените от Вас стойности и НЕ е оферта. Точните мита, ДДС, такси и
          транспорт зависят от конкретния автомобил и текущите тарифи. За точна калкулация се свържете с нас.
        </p>
      </div>
    </div>
  );
}
