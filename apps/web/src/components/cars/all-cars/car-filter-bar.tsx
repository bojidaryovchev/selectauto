"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Combobox } from "@/components/common";
import { FlagCaIcon, FlagKrIcon, FlagUsIcon } from "@/components/icons";
import { useFilterNav } from "@/contexts/filter-nav-context";
import { serializeCarFilters } from "@/lib/car-filters";
import type { CarFilters, FacetOptions } from "@/types/car-filters.type";

/**
 * Market segments. `undefined` value = "Всички" — it renders the animated earth
 * (no `Icon`); the country segments render their flag SVG via `Icon`.
 */
const MARKETS: { value: CarFilters["market"]; label: string; Icon?: ComponentType<{ className?: string }> }[] = [
  { value: undefined, label: "Всички" },
  { value: "kr", label: "Корея", Icon: FlagKrIcon },
  { value: "us", label: "САЩ", Icon: FlagUsIcon },
  { value: "ca", label: "Канада", Icon: FlagCaIcon },
];

/**
 * Auction-timing windows (ACTIVE view only). `undefined` = "Всички" (no
 * predicate). Day-scale, not hours: only ~13.5% of active cars have a future
 * auction date and 0 auction within an hour, so hour buckets would be empty —
 * see docs/08-web-all-cars-page.md §3.
 */
const AUCTION_WINDOWS: { value: CarFilters["auctionWindow"]; label: string }[] = [
  { value: undefined, label: "Всички" },
  { value: "scheduled", label: "С насрочен търг" },
  { value: "today", label: "Днес" },
  { value: "24h", label: "24 часа" },
  { value: "3d", label: "До 3 дни" },
  { value: "7d", label: "До 7 дни" },
];

/** Text inputs apply after the user stops typing (the rest apply instantly). */
const TEXT_DEBOUNCE_MS = 1500;

const inputCls =
  "h-11 w-full rounded-[10px] border border-[#ddd] bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-[#bbb] focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * Pill / chip styling for the segmented scope controls (market + auction window).
 * These used to be a fixed `inline-flex overflow-hidden` bar that clipped its
 * later options on narrow phones; wrapping pills (`flex flex-wrap gap-2`) grow to
 * as many rows as they need without ever cutting a label off.
 */
const pillBase =
  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition";
const pillActive = "border-brand bg-brand text-white";
const pillIdle = "border-[#ddd] bg-white text-ink hover:border-[#bbb] hover:bg-[#f6f6f6]";

/**
 * The catalog filter bar. **No submit button** — filters apply automatically:
 *  - Dropdowns, the market/auction pill controls, and the status/buy-now toggles
 *    apply **instantly** on change.
 *  - The text inputs (year from/to, price from/to, lot/VIN) apply after a
 *    ~1.5s **debounce** (so we don't navigate on every keystroke).
 *
 * Applying = a soft `router.replace` (via `useFilterNav().navigate`) with the
 * serialized filters in the URL (replace, not push, so rapid changes don't flood
 * browser history). The page re-renders SSR for the new filters and `AllCarsGrid`
 * resets via its key. Because that navigation is a React transition — which keeps
 * the old grid on screen and suppresses the Suspense skeleton — the provider's
 * `pending` flag drives the visible feedback (dimmed grid + indicator); the
 * debounced text inputs additionally flag `setSoftPending` on keystroke so the
 * gap before the debounce fires isn't dead. `current` seeds the controls from the
 * URL-parsed filters.
 *
 * Layout (top → bottom): mode toggle + clear · lot/VIN lookup · primary filters
 * (make/model/type + price/year) · scope (market/buy-now/auction) · secondary
 * attributes (fuel/drive/condition/colour). The secondary block collapses behind
 * an "Още филтри" toggle on phones (`lg` and up it's always expanded) so the
 * results grid sits higher on small screens.
 */
export function CarFilterBar({ facets, current }: { facets: FacetOptions; current: CarFilters }) {
  const { navigate, setSoftPending } = useFilterNav();
  // `draft` mirrors the controls (so typing is responsive); the URL is the
  // source of truth and is updated instantly or debounced per control.
  const [draft, setDraft] = useState<CarFilters>(current);

  // Keep the controls in sync when the URL changes from elsewhere (back/forward,
  // a card link, Clear). React's "adjust state during render" pattern — no effect,
  // no cascading render: when the incoming `current` differs from what we last
  // saw, reset the draft to it before painting.
  const currentKey = serializeCarFilters(current).toString();
  const [seenKey, setSeenKey] = useState(currentKey);
  if (seenKey !== currentKey) {
    setSeenKey(currentKey);
    setDraft(current);
  }

  const models = useMemo(() => {
    if (draft.brand === undefined) return [];
    return facets.modelsByBrand[String(draft.brand)] ?? [];
  }, [draft.brand, facets.modelsByBrand]);

  const apply = (next: CarFilters) => {
    const qs = serializeCarFilters(next).toString();
    navigate(qs ? `?${qs}` : "?");
  };

  // Build the next draft for a single key (handles clearing + brand→model reset).
  const withChange = <K extends keyof CarFilters>(d: CarFilters, key: K, value: CarFilters[K]): CarFilters => {
    const next = { ...d, [key]: value };
    if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) delete next[key];
    if (key === "brand") delete next.model;
    // Auction window is active-only; switching to the past tab clears it (and the
    // control is hidden there) so it can't linger in the URL or draft.
    if (key === "status" && value === "past") delete next.auctionWindow;
    return next;
  };

  /** Instant: update the control AND navigate now. */
  const setInstant = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) => {
    const next = withChange(draft, key, value);
    setDraft(next);
    apply(next);
  };

  /** Debounced: update the control now, navigate after the user stops typing. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setDebounced = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) => {
    const next = withChange(draft, key, value);
    setDraft(next);
    // Flag pending NOW so the grid dims during the debounce window (the nav only
    // fires when the user stops typing); `navigate` clears it as it takes over.
    setSoftPending();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply(next), TEXT_DEBOUNCE_MS);
  };
  useEffect(() => () => void (debounceRef.current && clearTimeout(debounceRef.current)), []);

  const onReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraft({});
    navigate("?");
  };

  const numOrUndef = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };

  const isPast = draft.status === "past";

  // Applied-filter count for the Clear badge. Every set key in `draft` is a live
  // filter — `withChange` strips undefined/empty/NaN keys, so a plain key count
  // is exact (brand+model, priceMin+priceMax, etc. each count once).
  const appliedCount = Object.keys(draft).length;

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm max-md:p-4">
      {/* ── Mode toggle (Active vs Past) + Clear ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-[10px] border border-[#ddd]">
          <Button
            onClick={() => setInstant("status", undefined)}
            className={`px-5 py-2.5 text-sm font-bold transition ${!isPast ? "bg-brand text-white" : "bg-white text-ink hover:bg-[#f6f6f6]"}`}
          >
            Активни
          </Button>
          <Button
            onClick={() => setInstant("status", "past")}
            className={`px-5 py-2.5 text-sm font-bold transition ${isPast ? "bg-brand text-white" : "bg-white text-ink hover:bg-[#f6f6f6]"}`}
          >
            Приключили
          </Button>
        </div>
        <Button
          onClick={onReset}
          disabled={appliedCount === 0}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#ddd] px-5 text-sm font-semibold text-muted transition hover:border-[#bbb] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#ddd] disabled:hover:text-muted"
        >
          Изчисти филтрите
          {appliedCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold leading-none text-white">
              {appliedCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* ── Lot № / VIN lookup — a direct find, kept apart from the browse filters
          (debounced). ── */}
      <div className="mt-5">
        <label className={labelCls}>Търсене по лот № / VIN</label>
        <input
          className={`${inputCls} lg:max-w-md`}
          type="text"
          placeholder="Въведи лот номер или VIN…"
          value={draft.search ?? ""}
          onChange={(e) => setDebounced("search", e.target.value || undefined)}
        />
      </div>

      {/* ── Primary filters (always visible): make/model/type + price/year ── */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls}>Марка</label>
          <Combobox
            options={[{ value: "", label: "Всички марки" }, ...facets.brands.map((b) => ({ value: b.value, label: b.label }))]}
            value={draft.brand != null ? String(draft.brand) : ""}
            onValueChange={(v) => setInstant("brand", v ? Number(v) : undefined)}
            searchPlaceholder="Търсене на марка…"
          />
        </div>
        <div>
          <label className={labelCls}>Модел</label>
          <Combobox
            options={[
              { value: "", label: draft.brand === undefined ? "Първо избери марка" : "Всички модели" },
              ...models.map((m) => ({ value: m.value, label: m.label })),
            ]}
            value={draft.model != null ? String(draft.model) : ""}
            disabled={draft.brand === undefined}
            onValueChange={(v) => setInstant("model", v ? Number(v) : undefined)}
            searchPlaceholder="Търсене на модел…"
          />
        </div>
        <div>
          <label className={labelCls}>Тип</label>
          <Combobox
            // Zero in the current (filtered) subset → disable so the user can't pick a
            // dead-end combo; never disable the active selection itself.
            options={[
              { value: "", label: "Всички типове" },
              ...facets.types.map((t) => ({
                value: t.value,
                label: t.label,
                count: t.count,
                disabled: t.count === 0 && t.value !== draft.type,
              })),
            ]}
            value={draft.type ?? ""}
            onValueChange={(v) => setInstant("type", v || undefined)}
          />
        </div>
      </div>

      {/* Price + year ranges — debounced */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Цена от ($)</label>
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={draft.priceMin ?? ""}
            onChange={(e) => setDebounced("priceMin", numOrUndef(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>Цена до ($)</label>
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            placeholder="∞"
            value={draft.priceMax ?? ""}
            onChange={(e) => setDebounced("priceMax", numOrUndef(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>Година от</label>
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            placeholder="1990"
            value={draft.yearFrom ?? ""}
            onChange={(e) => setDebounced("yearFrom", numOrUndef(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>Година до</label>
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            placeholder="2027"
            value={draft.yearTo ?? ""}
            onChange={(e) => setDebounced("yearTo", numOrUndef(e.target.value))}
          />
        </div>
      </div>

      {/* ── Scope: market + buy-now (instant) ── */}
      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <label className={labelCls}>Пазар</label>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((m) => {
              const active = draft.market === m.value;
              const Icon = m.Icon;
              return (
                <Button
                  key={m.label}
                  onClick={() => setInstant("market", m.value)}
                  className={`${pillBase} ${active ? pillActive : pillIdle}`}
                >
                  {Icon ? (
                    <Icon className="h-3.5 w-5.25 overflow-hidden rounded-xs shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                  ) : (
                    // Animated earth (animated WebP — rendered via <img>; Next's
                    // optimizer would strip the animation, so a plain <img> is used).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/icons/earth-spinning.webp" alt="" width={48} height={48} className="size-5" />
                  )}
                  {m.label}
                </Button>
              );
            })}
          </div>
        </div>

        <label className="flex h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            className="size-5 accent-brand"
            checked={draft.channel === "buy-now"}
            onChange={(e) => setInstant("channel", e.target.checked ? "buy-now" : undefined)}
          />
          Само с Buy Now
        </label>
      </div>

      {/* Auction-timing window (instant) — ACTIVE view only. Hidden on the past
          tab, where every lot has concluded and a future-date window is moot. */}
      {!isPast ? (
        <div className="mt-4">
          <label className={labelCls}>Търг</label>
          <div className="flex flex-wrap gap-2">
            {AUCTION_WINDOWS.map((w) => {
              const active = draft.auctionWindow === w.value;
              return (
                <Button
                  key={w.label}
                  onClick={() => setInstant("auctionWindow", w.value)}
                  className={`${pillBase} ${active ? pillActive : pillIdle}`}
                >
                  {w.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Secondary attributes — always visible (separated by a divider) ── */}
      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Гориво</label>
          <Combobox
            // Zero in the current (filtered) subset → disable; never the active one.
            options={[
              { value: "", label: "Всички" },
              ...facets.fuels.map((f) => ({
                value: f.value,
                label: f.label,
                count: f.count,
                disabled: f.count === 0 && f.value !== draft.fuel,
              })),
            ]}
            value={draft.fuel ?? ""}
            onValueChange={(v) => setInstant("fuel", v || undefined)}
          />
        </div>
        <div>
          <label className={labelCls}>Задвижване</label>
          <Combobox
            options={[{ value: "", label: "Всички" }, ...facets.drives.map((d) => ({ value: d.value, label: d.label }))]}
            value={draft.drive ?? ""}
            onValueChange={(v) => setInstant("drive", v || undefined)}
          />
        </div>
        <div>
          <label className={labelCls}>Състояние</label>
          <Combobox
            // Zero in the current (filtered) subset → disable; never the active one.
            options={[
              { value: "", label: "Всички състояния" },
              ...facets.conditions.map((c) => ({
                value: c.value,
                label: c.label,
                count: c.count,
                disabled: c.count === 0 && c.value !== draft.condition,
              })),
            ]}
            value={draft.condition ?? ""}
            onValueChange={(v) => setInstant("condition", v || undefined)}
          />
        </div>
        <div>
          <label className={labelCls}>Цвят</label>
          <Combobox
            options={[{ value: "", label: "Всички цветове" }, ...facets.colors.map((c) => ({ value: c.value, label: c.label }))]}
            value={draft.color ?? ""}
            onValueChange={(v) => setInstant("color", v || undefined)}
          />
        </div>
      </div>
    </div>
  );
}
