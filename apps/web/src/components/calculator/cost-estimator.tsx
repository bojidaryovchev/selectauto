"use client";

import { type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { Combobox } from "@/components/common";
import {
  AlertIcon,
  CheckIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  InfoIcon,
  MapPinIcon,
  ShipIcon,
} from "@/components/icons";
import {
  bgDecimal,
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
 *  - 🇺🇸 USA: the same numbered payments — Плащане 1 (car + auction fee +
 *    fixed fees) / Плащане 2 (inland+container to Holland, resolved from the
 *    ~600-row location table) / Плащане 3 (duty + VAT + agency) / Плащане 4
 *    (autovoz to BG) + optional technotest. Shows "not found" and no total when
 *    the auction/location can't be matched (техн. задание §10).
 *  - 🇨🇦 Canada: same as USA but a flat transport figure (no location lookup).
 *
 * The customs-base % field lowers only the duty/VAT base. Still an ESTIMATE, not
 * an offer. The gated „Получете разбивката на имейл" form re-computes the same
 * breakdown server-side from the raw inputs.
 *
 * Look (boards `im-calc*`, `im-dialog*`; parity check docs/design/parity/kalkulator.md): the inputs on the left — the
 * two- and three-way choices as segmented controls, the price and customs base as kit fields with their unit, the
 * options as kit check rows — and the breakdown panel on the right (below from 1024 px down). On a phone the boards
 * draw a six-step guided sequence; until the owner decides on it (REDESIGN.md), phones keep today's single form.
 */

const VEHICLE_TYPES: { id: VehicleType; label: string }[] = [
  { id: "sedan", label: "Седан" },
  { id: "suv", label: "Джип / SUV" },
];

const AUCTIONS: { id: UsAuction; label: string }[] = [
  { id: "copart", label: "Copart" },
  { id: "iaai", label: "IAAI" },
];

/** Canada splits into the pricier west coast (BC) and everything else. */
type CaProvince = "other" | "bc";
const CA_PROVINCES: { id: CaProvince; label: string }[] = [
  { id: "other", label: "Друга провинция" },
  { id: "bc", label: "Британска Колумбия" },
];

/** Each market's flag in its segment. */
const MARKET_FLAGS: Record<MarketId, ReactNode> = {
  kr: <FlagKrIcon className="sa-flag" />,
  us: <FlagUsIcon className="sa-flag" />,
  ca: <FlagCaIcon className="sa-flag" />,
};

/** "15 751 $" — space-grouped + $ suffix, matching the site's price style. */
function usdFmt(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  // Non-breaking spaces (U+00A0) for both the thousands separator and the ` $`
  // suffix so the amount never wraps across lines (e.g. "16 490 $" stays intact).
  return `${Math.round(n).toLocaleString("bg-BG").replace(/\s/g, " ")} $`;
}

/** "1 630 €" — for the fees the owner quotes in EUR (shown unconverted). */
function eurFmt(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.round(n).toLocaleString("bg-BG")} €`.replace(/\s/g, " ");
}

/** What the phone dialog's footer shows under the form: the total, or why there is none yet. */
export type EstimateSummary = { totalUsd?: string; prompt?: string };

/** A numeric kit field with its unit. Module-scoped — a render-time definition would remount the `<input>` each
 *  keystroke and lose focus. 16 px text avoids iOS zoom.
 *
 *  Holds a local text `draft` while the user is editing so the field can be
 *  CLEARED or left partial ("", "1", "1.") instead of snapping to a number on
 *  every keystroke — the old `value={number}` control coerced an empty field to 0,
 *  which a min-clamped parent (e.g. customs base, min 1) then bounced to 1, making
 *  the input impossible to clear and retype. A parseable value is still pushed up
 *  live (the breakdown recomputes as you type); on blur the draft is dropped and
 *  the input snaps back to the parent's clamped numeric value. The spinner arrows are hidden, as drawn; the arrow
 *  keys still step. */
function NumberField({
  id,
  label,
  unit,
  hint,
  value,
  onChange,
  step = 100,
  max,
}: {
  id: string;
  label: string;
  unit: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="sa-fld">
      <label className="sa-lbl" htmlFor={id}>
        {label}
      </label>
      <span className="sa-inw">
        <input
          id={id}
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
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="sa-in has-end im-num pl-3.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="sa-inw__unit">{unit}</span>
      </span>
      {hint ? (
        <span id={`${id}-hint`} className="sa-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** A labelled segmented control (the kit's `sa-seg`): one pressed button per choice. */
function SegField<T extends string>({
  label,
  value,
  onChange,
  options,
  stack = false,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: ReactNode }[];
  /** On a phone the options stack, for labels too long to share a row („Британска Колумбия"). */
  stack?: boolean;
}) {
  return (
    <div className="sa-fld">
      <span className="sa-lbl">{label}</span>
      <div className={stack ? "sa-seg im-seg im-seg--stack" : "sa-seg im-seg"} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A kit check row (`sa-chk`, orange box and outline while ticked). The input is visually hidden, so the row shows
 *  the keyboard focus ring. */
function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`sa-chk im-opt has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ortx ${checked ? "is-on" : ""}`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="sa-box">
        <CheckIcon />
      </span>
      <span>{children}</span>
    </label>
  );
}

/** A state in the breakdown panel instead of the lines: a prompt with its icon, or a spinner. */
function PanelStatus({ icon, busy, children }: { icon?: ReactNode; busy?: boolean; children: ReactNode }) {
  return (
    <div className="im-st" role="status">
      {busy ? <span className="sa-spin im-st__spin" aria-hidden="true" /> : <span className="im-st__ic">{icon}</span>}
      <p>{children}</p>
      {busy ? (
        <div className="im-st__sk" aria-hidden="true">
          <span className="im-skl" />
          <span className="im-skl" />
          <span className="im-skl" />
          <span className="im-skl" />
        </div>
      ) : null}
    </div>
  );
}

/** An error in the breakdown panel. */
function PanelError({ children }: { children: ReactNode }) {
  return (
    <div className="sa-alert sa-alert--neg" role="alert">
      <AlertIcon />
      <div>
        <p className="im-alert-t">{children}</p>
      </div>
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
  defaultCaFromBc,
  bare = false,
  onSummary,
}: {
  defaultMarket?: MarketId;
  defaultPrice?: number;
  defaultVehicleType?: VehicleType;
  /** The seeding car's auction house (Copart/IAAI) — presets the auction control. */
  defaultAuction?: UsAuction;
  /** The seeding car's yard zip/city/state — preselects the US location dropdown. */
  defaultUsLocation?: { zip?: string; city?: string; state?: string };
  /** The seeding car sits in British Columbia — presets the Canada province control. */
  defaultCaFromBc?: boolean;
  bare?: boolean;
  /** Reports the total (or the prompt instead of one) as it changes — the phone dialog's footer shows it. */
  onSummary?: (summary: EstimateSummary) => void;
} = {}) {
  const uid = useId();
  const [market, setMarket] = useState<MarketId>(defaultMarket);
  const [price, setPrice] = useState(defaultPrice && defaultPrice > 0 ? defaultPrice : 15000);
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const [auction, setAuction] = useState<UsAuction>(defaultAuction ?? "copart");
  const [location, setLocation] = useState<string>("");
  // Canada: British Columbia ships from the west coast at a materially higher
  // rate than the Montreal-routed rest of Canada, so it is its own choice.
  const [caProvince, setCaProvince] = useState<CaProvince>(defaultCaFromBc ? "bc" : "other");
  const [customsBasePct, setCustomsBasePct] = useState<number>(DEFAULT_CUSTOMS_BASE_PCT);
  const [technotest, setTechnotest] = useState(false);
  // Conservative default: without the origin declaration Korea pays the full 10%.
  const [originDeclaration, setOriginDeclaration] = useState(false);

  const activeMarket = MARKETS.find((m) => m.id === market)!;

  // Editable calculator config (fees/commission/transport/rates). Starts from the
  // built-in defaults (correct + tiny) and swaps to the admin-set values from
  // /api/calc-config once loaded — no loading gate needed. The route leaves out
  // the mobile.bg markup (unused here), so the answer is laid over the defaults.
  const [config, setConfig] = useState<CalcConfig>(DEFAULT_CALC_CONFIG);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/calc-config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: Partial<CalcConfig>) => {
        if (!cancelled) setConfig({ ...DEFAULT_CALC_CONFIG, ...c });
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
  // valid for the chosen auction; otherwise fall back to THIS car's own yard.
  //
  // Deliberately NO fall back to `locationOptions[0]`: that silently priced every
  // unmatched yard as the alphabetically-first row — "AB CALGARY" for Copart
  // (a Canadian yard, Montreal terminal, $3 190 sedan) or "ACE - Carson (CA)"
  // for IAAI — so a New Jersey car quietly quoted Calgary transport, ~$2 000 too
  // high, and the wrong figure flowed into the emailed offer too. When the yard
  // can't be matched we show nothing and ask the user to choose (техн. задание
  // §10: never invent a total).
  const locationOptions = useMemo(
    () => (market === "us" && tariffs ? usLocationsForAuction(auction, tariffs) : []),
    [market, auction, tariffs],
  );
  const effectiveLocation =
    market === "us" ? (locationOptions.includes(location) ? location : (seededLocation ?? "")) : "";

  // Resolve US inland + container transport for the current selection.
  const usTransport = useMemo(
    () =>
      market === "us" && tariffs && effectiveLocation
        ? resolveUsTransport({ auction, location: effectiveLocation, vehicleType }, tariffs)
        : null,
    [market, auction, effectiveLocation, vehicleType, tariffs],
  );
  /** Tariffs are loaded but no yard is chosen yet — a prompt, not an error. */
  const locationPending = market === "us" && !!tariffs && !effectiveLocation;
  const transportNotFound =
    market === "us" && !!tariffs && !locationPending && (!usTransport || usTransport.notFound);

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
      caFromBc: market === "ca" ? caProvince === "bc" : undefined,
      usInlandUsd: usTransport && !usTransport.notFound ? usTransport.inland : undefined,
      usContainerUsd: usTransport && !usTransport.notFound ? usTransport.container : undefined,
    }),
    [
      market,
      vehicleType,
      price,
      customsBasePct,
      technotest,
      originDeclaration,
      auction,
      effectiveLocation,
      usTransport,
      caProvince,
    ],
  );

  // Can't compute a US total until the tariffs are loaded, a yard is chosen, and
  // that yard resolves to a route — otherwise the transport leg would silently
  // count as 0.
  const b = useMemo(
    () =>
      tariffsPending || locationPending || transportNotFound ? null : computeImportBreakdown(inputs, config),
    [inputs, tariffsPending, locationPending, transportNotFound, config],
  );

  // The phone dialog's footer follows the panel: the total, or the prompt that stands in for it.
  const summaryTotal = b ? usdFmt(b.totalUsd) : undefined;
  const summaryPrompt = tariffsPending
    ? "Зареждане на тарифи…"
    : locationPending
      ? "Изберете локация на аукциона, за да изчислим транспорта."
      : undefined;
  useEffect(() => {
    onSummary?.({ totalUsd: summaryTotal, prompt: summaryPrompt });
  }, [onSummary, summaryTotal, summaryPrompt]);

  return (
    <div className={bare ? "im-est im-est--bare" : "im-est"}>
      {/* Inputs */}
      <div className="im-in">
        <SegField
          label="Пазар"
          value={market}
          onChange={setMarket}
          options={MARKETS.map((m) => ({ id: m.id, label: m.label, icon: MARKET_FLAGS[m.id] }))}
        />

        <NumberField id={`${uid}-price`} label="Цена на автомобила ($)" unit="$" value={price} onChange={setPrice} step={500} />

        {market !== "kr" ? (
          <div className="im-2">
            <SegField label="Тип автомобил" value={vehicleType} onChange={setVehicleType} options={VEHICLE_TYPES} />
            <SegField label="Аукцион" value={auction} onChange={setAuction} options={AUCTIONS} />
          </div>
        ) : (
          <SegField label="Тип автомобил" value={vehicleType} onChange={setVehicleType} options={VEHICLE_TYPES} />
        )}

        {/* Canada: the BC (west-coast) leg is priced separately from the rest. */}
        {market === "ca" ? (
          <SegField label="Провинция" value={caProvince} onChange={setCaProvince} options={CA_PROVINCES} stack />
        ) : null}

        {/* US: auction location → terminal/inland/container lookup */}
        {market === "us" ? (
          <div className="sa-fld">
            <span className="sa-lbl">Локация на аукциона</span>
            <Combobox
              look="kit"
              icon={<MapPinIcon />}
              aria-label="Локация на аукциона"
              options={locationOptions.map((loc) => ({ value: loc, label: loc }))}
              value={effectiveLocation}
              onValueChange={setLocation}
              disabled={tariffsPending || tariffErr}
              placeholder={
                tariffsPending ? "Зареждане на локации…" : tariffErr ? "Грешка при зареждане" : "Изберете локация"
              }
              searchPlaceholder="Търсене на локация…"
              emptyText="Няма намерена локация"
            />
            {usTransport && !usTransport.notFound ? (
              <span className="sa-hint im-term">
                {usTransport.container > 0 ? (
                  <>
                    Терминал: <b>{usTransport.terminal}</b> · вътрешен {usdFmt(usTransport.inland)} + контейнер{" "}
                    {usdFmt(usTransport.container)}
                  </>
                ) : (
                  // Owner-quoted flat yards: one all-in figure, no inland/container split.
                  <>
                    Терминал: <b>{usTransport.terminal}</b> · транспорт до Холандия {usdFmt(usTransport.total)} (обща
                    цена)
                  </>
                )}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Korea duty toggle — the EU–KR FTA origin-declaration nuance. */}
        {activeMarket.originToggle ? (
          <CheckRow checked={originDeclaration} onChange={setOriginDeclaration}>
            <b>Декларация за произход от одобрен износител</b> — при внос от Корея митото е <b>0% вместо 10%</b>,
            когато корейският износител издаде декларация за преференциален произход (Споразумението ЕС–Корея). Без
            нея се дължи пълното мито.
          </CheckRow>
        ) : null}

        {/* Optional технотест */}
        <CheckRow checked={technotest} onChange={setTechnotest}>
          <b>Технотест (индивидуално одобряване)</b> — по желание. Добавя <b>{eurFmt(config.technotestEur)}</b> към
          калкулацията.
        </CheckRow>

        <NumberField
          id={`${uid}-base`}
          label="Митническа основа (% от стойността)"
          unit="%"
          hint="Процент от стойността, върху който се начисляват мито и ДДС. По подразбиране 100% (пълната стойност)."
          value={customsBasePct}
          onChange={(v) => setCustomsBasePct(Math.min(100, Math.max(1, v)))}
          step={5}
          max={100}
        />

        <p className="im-fine">
          <InfoIcon />
          <span>
            Цените на автомобилите са в щатски долари ($); таксите, договорени в евро, са показани в евро (€). Общата
            сума е в долари по курс 1 € ≈ {bgDecimal(config.eurUsd)} $. Ставките са проверени към {RATES_VERIFIED_AT}.
            Това е ориентировъчна оценка, не оферта.
          </span>
        </p>
      </div>

      {/* Result */}
      <section className="im-out" aria-label="Ориентировъчна разбивка">
        <h3 className="im-out__h">Ориентировъчна разбивка</h3>

        {tariffsPending ? (
          <PanelStatus busy>Зареждане на тарифи…</PanelStatus>
        ) : tariffErr ? (
          <PanelError>
            Грешка при зареждане на транспортните тарифи. Опреснете страницата или направете запитване.
          </PanelError>
        ) : locationPending ? (
          // No yard chosen yet (or this car's yard isn't in the tariff table).
          // A prompt, not an error — and never a silently substituted yard.
          <PanelStatus icon={<MapPinIcon />}>Изберете локация на аукциона, за да изчислим транспорта.</PanelStatus>
        ) : transportNotFound || !b ? (
          <PanelError>
            Не е намерена транспортна цена за избрания аукцион и локация. Изберете друга локация или направете
            запитване за конкретния автомобил.
          </PanelError>
        ) : (
          <>
            <dl className="im-lines">
              {b.lines.map((l) => (
                <div key={l.label} className={`im-ln ${l.muted ? "is-mut" : ""}`}>
                  <dt>{l.label}</dt>
                  <dd>{l.amountEur != null ? eurFmt(l.amountEur) : usdFmt(l.amountUsd)}</dd>
                </div>
              ))}
            </dl>
            <div className="im-total">
              <span>Общо (ориентир)</span>
              <b>{usdFmt(b.totalUsd)}</b>
            </div>
            <p className="im-eta">
              <ShipIcon />
              <span>
                Ориентировъчен срок за доставка: <span className="im-nw">{activeMarket.transit}</span>
              </span>
            </p>
            <p className="im-disc">
              Това е ориентировъчна оценка по зададените от Вас стойности и <strong>НЕ</strong> е оферта. Точните мита,
              ДДС, такси и транспорт зависят от конкретния автомобил и текущите тарифи.
            </p>

            {/* Gated offer: email me this breakdown (lead capture). */}
            <CalculatorOfferForm inputs={inputs} />
          </>
        )}
      </section>
    </div>
  );
}
