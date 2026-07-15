"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/common";
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

const selectCls =
  "h-11 w-full appearance-none rounded-[10px] border border-[#ddd] bg-white px-3.5 pr-9 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 [background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='8'%20viewBox='0%200%2012%208'%3E%3Cpath%20d='M1%201l5%205%205-5'%20stroke='%23999'%20stroke-width='1.5'%20fill='none'%20stroke-linecap='round'/%3E%3C/svg%3E')] [background-position:right_14px_center] [background-repeat:no-repeat]";
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
          className="inline-flex h-10 items-center rounded-[10px] border border-[#ddd] px-5 text-sm font-semibold text-muted transition hover:border-[#bbb] hover:text-ink"
        >
          Изчисти филтрите
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
          <select className={selectCls} value={draft.brand ?? ""} onChange={(e) => setInstant("brand", numOrUndef(e.target.value))}>
            <option value="">Всички марки</option>
            {facets.brands.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Модел</label>
          <select
            className={selectCls}
            value={draft.model ?? ""}
            disabled={draft.brand === undefined}
            onChange={(e) => setInstant("model", numOrUndef(e.target.value))}
          >
            <option value="">{draft.brand === undefined ? "Първо избери марка" : "Всички модели"}</option>
            {models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Тип</label>
          <select className={selectCls} value={draft.type ?? ""} onChange={(e) => setInstant("type", e.target.value || undefined)}>
            <option value="">Всички типове</option>
            {facets.types.map((t) => (
              // Zero in the current (filtered) subset → disable so the user can't
              // pick a dead-end combo; never disable the active selection itself.
              <option key={t.value} value={t.value} disabled={t.count === 0 && t.value !== draft.type}>
                {t.label}
                {t.count !== undefined ? ` (${t.count})` : ""}
              </option>
            ))}
          </select>
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
          <select className={selectCls} value={draft.fuel ?? ""} onChange={(e) => setInstant("fuel", e.target.value || undefined)}>
            <option value="">Всички</option>
            {facets.fuels.map((f) => (
              // Zero in the current (filtered) subset → disable; never the active one.
              <option key={f.value} value={f.value} disabled={f.count === 0 && f.value !== draft.fuel}>
                {f.label}
                {f.count !== undefined ? ` (${f.count})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Задвижване</label>
          <select className={selectCls} value={draft.drive ?? ""} onChange={(e) => setInstant("drive", e.target.value || undefined)}>
            <option value="">Всички</option>
            {facets.drives.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Състояние</label>
          <select
            className={selectCls}
            value={draft.condition ?? ""}
            onChange={(e) => setInstant("condition", e.target.value || undefined)}
          >
            <option value="">Всички състояния</option>
            {facets.conditions.map((c) => (
              // Zero in the current (filtered) subset → disable; never the active one.
              <option key={c.value} value={c.value} disabled={c.count === 0 && c.value !== draft.condition}>
                {c.label}
                {c.count !== undefined ? ` (${c.count})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Цвят</label>
          <select className={selectCls} value={draft.color ?? ""} onChange={(e) => setInstant("color", e.target.value || undefined)}>
            <option value="">Всички цветове</option>
            {facets.colors.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
