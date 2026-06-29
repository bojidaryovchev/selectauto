"use client";

import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/common";
import { FlagCaIcon, FlagKrIcon, FlagUsIcon } from "@/components/icons";
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

/** Text inputs apply after the user stops typing (the rest apply instantly). */
const TEXT_DEBOUNCE_MS = 1500;

const selectCls =
  "h-11 w-full appearance-none rounded-[10px] border border-[#ddd] bg-white px-3.5 pr-9 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 [background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='8'%20viewBox='0%200%2012%208'%3E%3Cpath%20d='M1%201l5%205%205-5'%20stroke='%23999'%20stroke-width='1.5'%20fill='none'%20stroke-linecap='round'/%3E%3C/svg%3E')] [background-position:right_14px_center] [background-repeat:no-repeat]";
const inputCls =
  "h-11 w-full rounded-[10px] border border-[#ddd] bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-[#bbb] focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * The catalog filter bar. **No submit button** — filters apply automatically:
 *  - Dropdowns, the market segmented control, and the status/buy-now toggles
 *    apply **instantly** on change.
 *  - The text inputs (year from/to, price from/to, lot/VIN) apply after a
 *    ~1.5s **debounce** (so we don't navigate on every keystroke).
 *
 * Applying = `router.replace` with the serialized filters in the URL (replace,
 * not push, so rapid changes don't flood browser history). The page re-renders
 * SSR for the new filters and `AllCarsGrid` resets via its key. `current` seeds
 * the controls from the URL-parsed filters.
 */
export function CarFilterBar({ facets, current }: { facets: FacetOptions; current: CarFilters }) {
  const router = useRouter();
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
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // Build the next draft for a single key (handles clearing + brand→model reset).
  const withChange = <K extends keyof CarFilters>(d: CarFilters, key: K, value: CarFilters[K]): CarFilters => {
    const next = { ...d, [key]: value };
    if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) delete next[key];
    if (key === "brand") delete next.model;
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply(next), TEXT_DEBOUNCE_MS);
  };
  useEffect(() => () => void (debounceRef.current && clearTimeout(debounceRef.current)), []);

  const onReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraft({});
    router.replace("?", { scroll: false });
  };

  const numOrUndef = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };

  const isPast = draft.status === "past";

  return (
    <div className="rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      {/* Active vs Past + Clear (top row) */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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

      {/* Attribute dropdowns — instant */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <option key={t.value} value={t.value}>
                {t.label}
                {t.count !== undefined ? ` (${t.count})` : ""}
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
              <option key={c.value} value={c.value}>
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
      </div>

      {/* Year + price ranges — debounced */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <div>
          <label className={labelCls}>Цена от (€)</label>
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
          <label className={labelCls}>Цена до (€)</label>
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            placeholder="∞"
            value={draft.priceMax ?? ""}
            onChange={(e) => setDebounced("priceMax", numOrUndef(e.target.value))}
          />
        </div>
      </div>

      {/* Search (debounced) + market (instant) + buy-now (instant) */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="lg:max-w-md lg:flex-1">
          <label className={labelCls}>Лот № / VIN</label>
          <input
            className={inputCls}
            type="text"
            placeholder="Въведи лот номер или VIN…"
            value={draft.search ?? ""}
            onChange={(e) => setDebounced("search", e.target.value || undefined)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelCls}>Пазар</label>
            <div className="inline-flex overflow-hidden rounded-[10px] border border-[#ddd]">
              {MARKETS.map((m) => {
                const active = draft.market === m.value;
                const Icon = m.Icon;
                return (
                  <Button
                    key={m.label}
                    onClick={() => setInstant("market", m.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-bold transition ${active ? "bg-brand text-white" : "bg-white text-ink hover:bg-[#f6f6f6]"}`}
                  >
                    {Icon ? (
                      <Icon className="h-3.5 w-5.25 overflow-hidden rounded-xs shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                    ) : (
                      // Animated earth (animated WebP — rendered via <img>; Next's
                      // optimizer would strip the animation, so a plain <img> is used).
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/icons/earth-spinning.webp" alt="" width={48} height={48} className="h-5 w-5" />
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
              className="h-5 w-5 accent-brand"
              checked={draft.channel === "buy-now"}
              onChange={(e) => setInstant("channel", e.target.checked ? "buy-now" : undefined)}
            />
            Само с Buy Now
          </label>
        </div>
      </div>
    </div>
  );
}
