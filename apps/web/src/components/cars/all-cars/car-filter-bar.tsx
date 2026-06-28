"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { serializeCarFilters } from "@/lib/car-filters";
import type { CarFilters, FacetOptions } from "@/types/car-filters.type";

/** Market segments, in the mockup's order. `undefined` value = "Всички". */
const MARKETS: { value: CarFilters["market"]; label: string; tag?: string }[] = [
  { value: undefined, label: "Всички", tag: "🌍" },
  { value: "kr", label: "Корея", tag: "KR" },
  { value: "us", label: "САЩ", tag: "US" },
  { value: "ca", label: "Канада", tag: "CA" },
];

const selectCls =
  "h-12 w-full appearance-none rounded-[10px] border border-[#ddd] bg-white px-3.5 pr-9 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 [background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='8'%20viewBox='0%200%2012%208'%3E%3Cpath%20d='M1%201l5%205%205-5'%20stroke='%23999'%20stroke-width='1.5'%20fill='none'%20stroke-linecap='round'/%3E%3C/svg%3E')] [background-position:right_14px_center] [background-repeat:no-repeat]";
const inputCls =
  "h-12 w-full rounded-[10px] border border-[#ddd] bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-[#bbb] focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * The catalog filter bar — ports the mockup: brand→model / color / drive
 * dropdowns, year-from/to, price-from/to, lot/VIN search, a market segmented
 * control + "Само с Buy Now" toggle, and ТЪРСИ / Изчисти. Stages changes locally
 * and applies them by pushing the URL on submit (the page re-renders SSR for the
 * new filters, and `AllCarsGrid` resets via its key). `current` seeds the form
 * from the URL-parsed filters.
 */
export function CarFilterBar({ facets, current }: { facets: FacetOptions; current: CarFilters }) {
  const router = useRouter();
  const [draft, setDraft] = useState<CarFilters>(current);

  // Models for the selected brand (lazy-narrowed from the shipped facet map).
  const models = useMemo(() => {
    if (draft.brand === undefined) return [];
    return facets.modelsByBrand[String(draft.brand)] ?? [];
  }, [draft.brand, facets.modelsByBrand]);

  const set = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) =>
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (value === undefined || value === "") delete next[key];
      // Changing brand invalidates the model selection.
      if (key === "brand") delete next.model;
      return next;
    });

  const apply = (next: CarFilters) => {
    const qs = serializeCarFilters(next).toString();
    router.push(qs ? `?${qs}` : "?");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apply(draft);
  };

  const onReset = () => {
    setDraft({});
    router.push("?");
  };

  const numOrUndef = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };

  const isPast = draft.status === "past";

  // The active/past switch changes which dataset is shown, so it applies
  // immediately (unlike the staged filters) — push the URL on click, carrying
  // the rest of the current draft.
  const setStatus = (status: CarFilters["status"]) => {
    const next = { ...draft, status };
    if (status !== "past") delete next.status;
    setDraft(next);
    apply(next);
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-sm">
      {/* Active vs Past toggle (changes the dataset; applies immediately) */}
      <div className="mb-5 inline-flex overflow-hidden rounded-[10px] border border-[#ddd]">
        <button
          type="button"
          onClick={() => setStatus("active")}
          className={`px-5 py-2.5 text-sm font-bold transition ${
            !isPast ? "bg-brand text-white" : "bg-white text-ink hover:bg-[#f6f6f6]"
          }`}
        >
          Активни
        </button>
        <button
          type="button"
          onClick={() => setStatus("past")}
          className={`px-5 py-2.5 text-sm font-bold transition ${
            isPast ? "bg-brand text-white" : "bg-white text-ink hover:bg-[#f6f6f6]"
          }`}
        >
          Приключили
        </button>
      </div>

      {/* Row 1: brand / model / color / drive */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Марка</label>
          <select
            className={selectCls}
            value={draft.brand ?? ""}
            onChange={(e) => set("brand", numOrUndef(e.target.value))}
          >
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
            onChange={(e) => set("model", numOrUndef(e.target.value))}
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
          <label className={labelCls}>Цвят</label>
          <select className={selectCls} value={draft.color ?? ""} onChange={(e) => set("color", e.target.value || undefined)}>
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
          <select className={selectCls} value={draft.drive ?? ""} onChange={(e) => set("drive", e.target.value || undefined)}>
            <option value="">Всички</option>
            {facets.drives.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Тип</label>
          <select className={selectCls} value={draft.type ?? ""} onChange={(e) => set("type", e.target.value || undefined)}>
            <option value="">Всички типове</option>
            {facets.types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {t.count !== undefined ? ` (${t.count})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: year from/to + price from/to */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Година от</label>
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            placeholder="1990"
            value={draft.yearFrom ?? ""}
            onChange={(e) => set("yearFrom", numOrUndef(e.target.value))}
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
            onChange={(e) => set("yearTo", numOrUndef(e.target.value))}
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
            onChange={(e) => set("priceMin", numOrUndef(e.target.value))}
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
            onChange={(e) => set("priceMax", numOrUndef(e.target.value))}
          />
        </div>
      </div>

      {/* Row 3: lot/VIN + market segmented + buy-now toggle */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="lg:max-w-md lg:flex-1">
          <label className={labelCls}>Лот № / VIN</label>
          <input
            className={inputCls}
            type="text"
            placeholder="Въведи лот номер или VIN…"
            value={draft.search ?? ""}
            onChange={(e) => set("search", e.target.value || undefined)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className={labelCls}>Пазар</label>
            <div className="inline-flex overflow-hidden rounded-[10px] border border-[#ddd]">
              {MARKETS.map((m) => {
                const active = draft.market === m.value;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => set("market", m.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-sm font-bold transition ${
                      active ? "bg-brand text-white" : "bg-white text-ink hover:bg-[#f6f6f6]"
                    }`}
                  >
                    {m.tag ? <span className="text-[11px] opacity-80">{m.tag}</span> : null}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 pt-6 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand"
              checked={draft.channel === "buy-now"}
              onChange={(e) => set("channel", e.target.checked ? "buy-now" : undefined)}
            />
            Само с Buy Now
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-gradient-to-r from-brand-dark to-brand px-7 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(216,111,22,0.22)] transition-transform hover:-translate-y-0.5"
        >
          Търси
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-12 items-center rounded-[10px] border border-[#ddd] px-6 text-sm font-semibold text-muted transition hover:border-[#bbb] hover:text-ink"
        >
          Изчисти
        </button>
      </div>
    </form>
  );
}
