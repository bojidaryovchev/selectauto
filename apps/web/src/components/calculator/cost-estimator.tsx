"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/common";
import {
  type CalcConfig,
  computeImportBreakdown,
  DEFAULT_CALC_CONFIG,
  DEFAULT_CUSTOMS_BASE_PCT,
  type ImportCostInputs,
  MARKETS,
  type MarketId,
  RATES_VERIFIED_AT,
  type UsAuction,
  usd,
  type VehicleType,
} from "@/data/import-rates";
import { resolveUsTransport, type UsTariffData, usLocationsForAuction } from "@/lib/us-transport";
import { CalculatorOfferForm } from "./calculator-offer-form";

/**
 * Import-cost estimator v3 — USD throughout (car prices arrive from the API in
 * USD). Three market models (see data/import-rates.ts):
 *  - 🇰🇷 Korea: commission (our service) + transport + duty (0% with the EU–KR
 *    origin-declaration toggle) + VAT + optional technotest.
 *  - 🇺🇸 USA: auction fee (tiered) + fixed fees + inland+container transport
 *    (resolved from the 597-row location table) to Holland → duty + VAT + agency
 *    + Holland→BG transport + optional technotest. Shows "not found" and no total
 *    when the auction/location can't be matched (техн. задание §10).
 *  - 🇨🇦 Canada: same as USA but a flat transport figure (no location lookup).
 *
 * The customs-base % field lowers only the duty/VAT base. Still an ESTIMATE, not
 * an offer. The gated „Получи разбивката на имейл" form re-computes the same
 * breakdown server-side from the raw inputs.
 */

const VEHICLE_TYPES: { id: VehicleType; label: string }[] = [
  { id: "sedan", label: "Седан" },
  { id: "suv", label: "Джип / SUV" },
];

const AUCTIONS: { id: UsAuction; label: string }[] = [
  { id: "copart", label: "Copart" },
  { id: "iaai", label: "IAAI" },
];

/** "15 751 $" — space-grouped + $ suffix, matching the site's price style. */
function usdFmt(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.round(n).toLocaleString("bg-BG").replace(/\s/g, " ")} $`;
}

/** A label/value breakdown row. Module-scoped to avoid remounting on each render. */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className={`text-sm ${muted ? "text-muted" : "text-[#5a5d64]"}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${muted ? "text-muted" : "text-ink"}`}>{value}</span>
    </div>
  );
}

/** A numeric input. Module-scoped — a render-time definition would remount the
 *  `<input>` each keystroke and lose focus. text-base (16px) avoids iOS zoom. */
function NumberField({
  label,
  value,
  onChange,
  step = 100,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base font-bold text-ink outline-none focus:border-brand"
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
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base font-bold text-ink outline-none focus:border-brand"
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
 * `defaultMarket` presets the market control; `defaultPrice` (USD) presets the
 * car price (the car-detail „Калкулирай вноса" deep link). Both are initial
 * values, not locks.
 */
export function CostEstimator({
  defaultMarket = "kr",
  defaultPrice,
  defaultVehicleType = "sedan",
}: { defaultMarket?: MarketId; defaultPrice?: number; defaultVehicleType?: VehicleType } = {}) {
  const [market, setMarket] = useState<MarketId>(defaultMarket);
  const [price, setPrice] = useState(defaultPrice && defaultPrice > 0 ? defaultPrice : 15000);
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const [auction, setAuction] = useState<UsAuction>("copart");
  const [location, setLocation] = useState<string>("");
  const [customsBasePct, setCustomsBasePct] = useState<number>(DEFAULT_CUSTOMS_BASE_PCT);
  const [technotest, setTechnotest] = useState(false);
  // Conservative default: without the origin declaration Korea pays the full 10%.
  const [originDeclaration, setOriginDeclaration] = useState(false);

  const activeMarket = MARKETS.find((m) => m.id === market)!;

  // Editable calculator config (fees/commission/transport/rates). Starts from the
  // built-in defaults (correct + tiny) and swaps to the admin-set values from
  // /api/calc-config once loaded — no loading gate needed.
  const [config, setConfig] = useState<CalcConfig>(DEFAULT_CALC_CONFIG);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/calc-config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: CalcConfig) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // US tariffs (the ~600-row location table) are fetched LAZILY — only when the
  // US market is first selected — from the cached /api/us-tariffs (active DB
  // version, or the static seed). Korea/Canada never download it.
  const [tariffs, setTariffs] = useState<UsTariffData | null>(null);
  const [tariffErr, setTariffErr] = useState(false);
  useEffect(() => {
    if (market !== "us" || tariffs || tariffErr) return;
    let cancelled = false;
    fetch("/api/us-tariffs")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: UsTariffData) => {
        if (!cancelled) setTariffs(d);
      })
      .catch(() => {
        if (!cancelled) setTariffErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, [market, tariffs, tariffErr]);

  const tariffsPending = market === "us" && !tariffs && !tariffErr;

  // US auction-location options (auction-specific). Keep the selected location
  // valid for the chosen auction; fall back to the first available.
  const locationOptions = useMemo(
    () => (market === "us" && tariffs ? usLocationsForAuction(auction, tariffs) : []),
    [market, auction, tariffs],
  );
  const effectiveLocation =
    market === "us" ? (locationOptions.includes(location) ? location : (locationOptions[0] ?? "")) : "";

  // Resolve US inland + container transport for the current selection.
  const usTransport = useMemo(
    () =>
      market === "us" && tariffs && effectiveLocation
        ? resolveUsTransport({ auction, location: effectiveLocation, vehicleType }, tariffs)
        : null,
    [market, auction, effectiveLocation, vehicleType, tariffs],
  );
  const transportNotFound = market === "us" && !!tariffs && (!usTransport || usTransport.notFound);

  const inputs: ImportCostInputs = useMemo(
    () => ({
      market,
      vehicleType,
      priceUsd: price,
      customsBasePct,
      technotest,
      originDeclaration: market === "kr" ? originDeclaration : undefined,
      auction: market === "kr" ? undefined : auction,
      location: market === "us" ? effectiveLocation : undefined,
      usInlandUsd: usTransport && !usTransport.notFound ? usTransport.inland : undefined,
      usContainerUsd: usTransport && !usTransport.notFound ? usTransport.container : undefined,
    }),
    [market, vehicleType, price, customsBasePct, technotest, originDeclaration, auction, effectiveLocation, usTransport],
  );

  // Can't compute a US total until the tariffs are loaded and resolve to a route.
  const b = useMemo(
    () => (tariffsPending || transportNotFound ? null : computeImportBreakdown(inputs, config)),
    [inputs, tariffsPending, transportNotFound, config],
  );

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

        <NumberField label="Цена на автомобила ($)" value={price} onChange={setPrice} step={500} />

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Тип автомобил" value={vehicleType} onChange={setVehicleType} options={VEHICLE_TYPES} />
          {market !== "kr" ? (
            <SelectField label="Аукцион" value={auction} onChange={setAuction} options={AUCTIONS} />
          ) : (
            <div />
          )}
        </div>

        {/* US: auction location → terminal/inland/container lookup */}
        {market === "us" ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Локация на аукциона</span>
            <select
              value={effectiveLocation}
              onChange={(e) => setLocation(e.target.value)}
              disabled={tariffsPending || tariffErr}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base font-bold text-ink outline-none focus:border-brand disabled:opacity-60"
            >
              {tariffsPending ? (
                <option>Зареждане на локации…</option>
              ) : tariffErr ? (
                <option>Грешка при зареждане</option>
              ) : (
                locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))
              )}
            </select>
            {usTransport && !usTransport.notFound ? (
              <span className="text-[11px]/relaxed text-muted">
                Терминал: <strong>{usTransport.terminal}</strong> · вътрешен {usdFmt(usTransport.inland)} + контейнер{" "}
                {usdFmt(usTransport.container)}
              </span>
            ) : null}
          </label>
        ) : null}

        {/* Korea duty toggle — the EU–KR FTA origin-declaration nuance. */}
        {activeMarket.originToggle ? (
          <label className="flex items-start gap-2.5 rounded-xl border border-line bg-[#f7f7f8] p-3">
            <input
              type="checkbox"
              checked={originDeclaration}
              onChange={(e) => setOriginDeclaration(e.target.checked)}
              className="mt-0.5 size-4 accent-brand"
            />
            <span className="text-[13px]/relaxed text-[#3d4046]">
              <strong>Декларация за произход от одобрен износител</strong> — при внос от Корея митото е{" "}
              <strong>0% вместо 10%</strong>, когато корейският износител издаде декларация за преференциален произход
              (Споразумението ЕС–Корея). Без нея се дължи пълното мито.
            </span>
          </label>
        ) : null}

        {/* Optional технотест */}
        <label className="flex items-start gap-2.5 rounded-xl border border-line bg-[#f7f7f8] p-3">
          <input
            type="checkbox"
            checked={technotest}
            onChange={(e) => setTechnotest(e.target.checked)}
            className="mt-0.5 size-4 accent-brand"
          />
          <span className="text-[13px]/relaxed text-[#3d4046]">
            <strong>Технотест (индивидуално одобряване)</strong> — по желание. Добавя ориентировъчно{" "}
            <strong>{usdFmt(usd(config.technotestEur, config.eurUsd))}</strong> към калкулацията.
          </span>
        </label>

        <div className="flex flex-col gap-1">
          <NumberField
            label="Митническа основа (% от стойността)"
            value={customsBasePct}
            onChange={(v) => setCustomsBasePct(Math.min(100, Math.max(1, v)))}
            step={5}
            max={100}
          />
          <span className="text-[11px]/relaxed text-muted">
            Процент от стойността, върху който се начисляват мито и ДДС. По подразбиране 100% (пълната стойност).
          </span>
        </div>

        <p className="text-xs/relaxed text-muted">
          Всички суми са в щатски долари ($). Ставките са проверени към {RATES_VERIFIED_AT}. Това е ориентировъчна
          оценка, не оферта.
        </p>
      </div>

      {/* Result */}
      <div className="flex flex-col rounded-[18px] bg-[#f7f7f8] p-5">
        <span className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Ориентировъчна разбивка</span>

        {tariffsPending ? (
          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-muted">Зареждане на тарифи…</div>
        ) : tariffErr ? (
          <div className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#b3261e]">
            Грешка при зареждане на транспортните тарифи. Опреснете страницата или направете запитване.
          </div>
        ) : transportNotFound || !b ? (
          <div className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#b3261e]">
            Не е намерена транспортна цена за избрания аукцион и локация. Изберете друга локация или направете
            запитване за конкретния автомобил.
          </div>
        ) : (
          <>
            {b.lines.map((l) => (
              <Row key={l.label} label={l.label} value={usdFmt(l.amountUsd)} muted={l.muted} />
            ))}
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[#2f343c] px-4 py-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-white/70">Общо (ориентир)</span>
              <span className="block text-xl font-black text-white tabular-nums">{usdFmt(b.totalUsd)}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-[#3d4046]">
              Ориентировъчен срок за доставка: {activeMarket.transit}
            </p>
            <p className="mt-2 text-xs/relaxed text-muted">
              Това е ориентировъчна оценка по зададените от Вас стойности и НЕ е оферта. Точните мита, ДДС, такси и
              транспорт зависят от конкретния автомобил и текущите тарифи.
            </p>

            {/* Gated offer: email me this breakdown (lead capture). */}
            <CalculatorOfferForm inputs={inputs} />
          </>
        )}
      </div>
    </div>
  );
}
