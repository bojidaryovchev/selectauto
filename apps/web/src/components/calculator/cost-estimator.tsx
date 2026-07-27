"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Combobox } from "@/components/common";
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
  type VehicleType,
} from "@/data/import-rates";
import { findUsLocation, resolveUsTransport, type UsTariffData, usLocationsForAuction } from "@/lib/us-transport";
import { CalculatorOfferForm } from "./calculator-offer-form";

/**
 * Import-cost estimator v3 — USD throughout (car prices arrive from the API in
 * USD). Three market models (see data/import-rates.ts):
 *  - 🇰🇷 Korea: the owner's 4-payment structure — Плащане 1 (price + ENCAR fee +
 *    docs%) / Плащане 2 (sea transport) / Плащане 3 (duty — 0% with the EU–KR
 *    origin-declaration toggle — + VAT + agency) / Плащане 4 (autovoz to BG),
 *    with the commission (our service) shown last + optional technotest.
 *  - 🇺🇸 USA: [car + auction fee (tiered) + fixed fees] in one line +
 *    inland+container transport (resolved from the 597-row location table) to
 *    Holland → duty + VAT + agency + Holland→BG transport + optional technotest.
 *    Shows "not found" and no total when the auction/location can't be matched
 *    (техн. задание §10).
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
  // Non-breaking spaces (U+00A0) for both the thousands separator and the ` $`
  // suffix so the amount never wraps across lines (e.g. "16 490 $" stays intact).
  return `${Math.round(n).toLocaleString("bg-BG").replace(/\s/g, " ")} $`;
}

/** "1 630 €" — for the fees the owner quotes in EUR (shown unconverted). */
function eurFmt(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.round(n).toLocaleString("bg-BG")} €`.replace(/\s/g, " ");
}

/** A label/value breakdown row. Module-scoped to avoid remounting on each render. */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
      <span className={`min-w-0 text-sm ${muted ? "text-muted" : "text-[#5a5d64]"}`}>{label}</span>
      <span className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums ${muted ? "text-muted" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

/** A numeric input. Module-scoped — a render-time definition would remount the
 *  `<input>` each keystroke and lose focus. text-base (16px) avoids iOS zoom.
 *
 *  Holds a local text `draft` while the user is editing so the field can be
 *  CLEARED or left partial ("", "1", "1.") instead of snapping to a number on
 *  every keystroke — the old `value={number}` control coerced an empty field to 0,
 *  which a min-clamped parent (e.g. customs base, min 1) then bounced to 1, making
 *  the input impossible to clear and retype. A parseable value is still pushed up
 *  live (the breakdown recomputes as you type); on blur the draft is dropped and
 *  the input snaps back to the parent's clamped numeric value. */
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
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={step}
        value={draft ?? String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === "") return; // let the field sit empty mid-edit — don't push a number yet
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.round(n)));
        }}
        onBlur={() => setDraft(null)}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base font-bold text-ink outline-none focus:border-brand"
      />
    </label>
  );
}

/** A labelled dropdown built on the shared {@link Combobox}. Module-scoped so the
 *  caption + control read as one field (like {@link NumberField}). */
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
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <Combobox
        options={options.map((o) => ({ value: o.id, label: o.label }))}
        value={value}
        onValueChange={(v) => onChange(v as T)}
      />
    </div>
  );
}

/**
 * `defaultMarket` presets the market control; `defaultPrice` (USD) presets the
 * car price (the car-detail „Калкулирай вноса" deep link). Both are initial
 * values, not locks. `bare` drops the outer card chrome (border/shadow/padding)
 * when the estimator is embedded in a surface that already provides it — e.g. the
 * per-listing calculator dialog.
 */
export function CostEstimator({
  defaultMarket = "kr",
  defaultPrice,
  defaultVehicleType = "sedan",
  defaultAuction,
  defaultUsLocation,
  bare = false,
}: {
  defaultMarket?: MarketId;
  defaultPrice?: number;
  defaultVehicleType?: VehicleType;
  /** The seeding car's auction house (Copart/IAAI) — presets the auction control. */
  defaultAuction?: UsAuction;
  /** The seeding car's yard zip/city/state — preselects the US location dropdown. */
  defaultUsLocation?: { zip?: string; city?: string; state?: string };
  bare?: boolean;
} = {}) {
  const [market, setMarket] = useState<MarketId>(defaultMarket);
  const [price, setPrice] = useState(defaultPrice && defaultPrice > 0 ? defaultPrice : 15000);
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const [auction, setAuction] = useState<UsAuction>(defaultAuction ?? "copart");
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

  // THIS car's auction yard resolved to a dropdown value — matched zip-first,
  // then city+state (`findUsLocation`; the API's branch names don't equal the
  // workbook's location strings). Derived, not stored: it only fills in while
  // the user hasn't picked a location, so a manual pick always wins.
  const seededLocation = useMemo(
    () =>
      market === "us" && tariffs && defaultUsLocation
        ? findUsLocation(defaultUsLocation, auction, tariffs)
        : undefined,
    [market, tariffs, defaultUsLocation, auction],
  );

  // US auction-location options (auction-specific). Keep the selected location
  // valid for the chosen auction; fall back to the car's own yard, then the first.
  const locationOptions = useMemo(
    () => (market === "us" && tariffs ? usLocationsForAuction(auction, tariffs) : []),
    [market, auction, tariffs],
  );
  const effectiveLocation =
    market === "us"
      ? locationOptions.includes(location)
        ? location
        : (seededLocation ?? locationOptions[0] ?? "")
      : "";

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
    <div
      className={
        bare
          ? "grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]"
          : "grid grid-cols-1 gap-6 rounded-card border border-line bg-white p-6 shadow-card lg:grid-cols-[1fr_1fr] max-md:p-5"
      }
    >
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
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Локация на аукциона</span>
            <Combobox
              options={locationOptions.map((loc) => ({ value: loc, label: loc }))}
              value={effectiveLocation}
              onValueChange={setLocation}
              disabled={tariffsPending || tariffErr}
              placeholder={
                tariffsPending ? "Зареждане на локации…" : tariffErr ? "Грешка при зареждане" : "Избери локация"
              }
              searchPlaceholder="Търсене на локация…"
              emptyText="Няма намерена локация"
            />
            {usTransport && !usTransport.notFound ? (
              <span className="text-[11px]/relaxed text-muted">
                {usTransport.container > 0 ? (
                  <>
                    Терминал: <strong>{usTransport.terminal}</strong> · вътрешен {usdFmt(usTransport.inland)} +
                    контейнер {usdFmt(usTransport.container)}
                  </>
                ) : (
                  // Owner-quoted flat yards: one all-in figure, no inland/container split.
                  <>
                    Терминал: <strong>{usTransport.terminal}</strong> · транспорт до Холандия{" "}
                    {usdFmt(usTransport.total)} (обща цена)
                  </>
                )}
              </span>
            ) : null}
          </div>
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
            <strong>Технотест (индивидуално одобряване)</strong> — по желание. Добавя{" "}
            <strong>{eurFmt(config.technotestEur)}</strong> към калкулацията.
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
          Цените на автомобилите са в щатски долари ($); таксите, договорени в евро, са показани в евро (€). Общата
          сума е в долари по курс 1 € ≈ {config.eurUsd} $. Ставките са проверени към {RATES_VERIFIED_AT}. Това е
          ориентировъчна оценка, не оферта.
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
              <Row
                key={l.label}
                label={l.label}
                value={l.amountEur != null ? eurFmt(l.amountEur) : usdFmt(l.amountUsd)}
                muted={l.muted}
              />
            ))}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#2f343c] px-4 py-3">
              <span className="min-w-0 text-sm font-semibold uppercase tracking-wide text-white/70">Общо (ориентир)</span>
              <span className="shrink-0 whitespace-nowrap text-xl font-black text-white tabular-nums">
                {usdFmt(b.totalUsd)}
              </span>
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
