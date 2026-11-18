"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, Combobox, IconButton } from "@/components/common";
import {
  CloseIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  GlobeIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "@/components/icons";
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

/** Phones get the sheet; from this width up the console shows (Tailwind's `sm`). */
const CONSOLE_QUERY = "(min-width: 640px)";

/** The spinning earth for „Всички"; a still globe under reduced motion (README, motion). */
function EarthIcon() {
  return (
    <>
      {/* Animated WebP through a plain <img>: Next's optimizer would strip the animation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/earth-spinning.webp" alt="" width={48} height={48} className="is-globe size-5 rounded-full motion-reduce:hidden" />
      <GlobeIcon className="hidden size-5 motion-reduce:block" />
    </>
  );
}

/** The number of applied filters, on „Изчистете филтрите" and „Филтри". */
function CountBadge({ n }: { n: number }) {
  return n > 0 ? <span className="sa-btn__n">{n}</span> : null;
}

/**
 * The catalog filters (boards `ct-catalog` and its states, `ct-sheet`, `ct-tablet`; parity check
 * docs/design/parity/vsichki-avtomobili.md). **No submit button** — filters apply automatically:
 *  - Dropdowns, the market and auction controls, the Buy Now switch and the Активни / Приключили tab apply
 *    **instantly** on change.
 *  - The text inputs (lot № / VIN, price from/to, year from/to) apply after a ~1.5 s **debounce**, so we don't
 *    navigate on every keystroke. An instant change made meanwhile takes the typed text with it and cancels the
 *    delayed apply, which would otherwise undo it.
 *
 * Applying = a soft `router.replace` (via `useFilterNav().navigate`) with the serialized filters in the URL
 * (replace, not push, so rapid changes don't flood browser history). The page re-renders on the server for the
 * new filters and `AllCarsGrid` resets via its key. Because that navigation is a React transition — which keeps
 * the old grid on screen and suppresses the Suspense skeleton — the provider's `pending` flag drives the visible
 * feedback (frosted cards, the spinner beside the count); the debounced text inputs flag `setSoftPending` on
 * keystroke so the gap before the debounce fires isn't dead. `current` seeds the controls from the URL.
 *
 * Layout:
 *  - **Tablet and desktop:** one console above the results. Head row: the tab, the lot / VIN search, „Изчистете
 *    филтрите" with the count of applied filters. Then Марка, Модел, Тип and the four numbers (one row from 1440 px,
 *    two below), then Пазар, Само с Buy Now and Търг, then Гориво, Задвижване, Състояние and Цвят.
 *  - **Phone:** the tab stays on the page, and the rest folds into „Филтри", a full-height sheet whose bottom button
 *    shows the result count and closes it. Filters still apply as they change (decision 5).
 *
 * The tab is not a filter: the badge doesn't count it and clearing keeps it.
 */
export function CarFilterBar({
  facets,
  current,
  count,
}: {
  facets: FacetOptions;
  current: CarFilters;
  /** Cars matching the current URL, for the sheet's button; null for a lot / VIN search, which has no count. */
  count: number | null;
}) {
  const { navigate, setSoftPending, pending, registerReset } = useFilterNav();
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelDebounce = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
  };
  useEffect(() => () => void (debounceRef.current && clearTimeout(debounceRef.current)), []);

  /** Instant: update the control AND navigate now. The draft already holds any text still waiting to apply, so the
   *  pending debounce is cancelled: firing later with the filters of its keystroke, it would undo this change. */
  const setInstant = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) => {
    cancelDebounce();
    const next = withChange(draft, key, value);
    setDraft(next);
    apply(next);
  };

  /** Debounced: update the control now, navigate after the user stops typing. */
  const setDebounced = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) => {
    const next = withChange(draft, key, value);
    setDraft(next);
    // Flag pending NOW so the grid dims during the debounce window (the nav only
    // fires when the user stops typing); `navigate` clears it as it takes over.
    setSoftPending();
    cancelDebounce();
    debounceRef.current = setTimeout(() => apply(next), TEXT_DEBOUNCE_MS);
  };

  /** Clears every filter but keeps the tab: the tab is not a filter (the badge doesn't count it either). */
  const onReset = () => {
    cancelDebounce();
    const next: CarFilters = draft.status === "past" ? { status: "past" } : {};
    setDraft(next);
    apply(next);
  };

  // The empty results offer „Изчистете филтрите" too (board `ct-empty`); they reach this reset through the context.
  const resetRef = useRef(onReset);
  useEffect(() => {
    resetRef.current = onReset;
  });
  useEffect(() => {
    registerReset(() => resetRef.current());
    return () => registerReset(null);
  }, [registerReset]);

  const numOrUndef = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };

  const isPast = draft.status === "past";

  // Applied filters for the badges. Every set key in `draft` is a live filter except the tab — `withChange` strips
  // undefined/empty/NaN keys, so a plain key count is exact (brand+model, priceMin+priceMax, etc. each count once).
  const appliedCount = Object.keys(draft).filter((k) => k !== "status").length;

  // ── The phone sheet ──
  const [sheetOpen, setSheetOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetTitleId = useId();
  const closeSheet = () => {
    setSheetOpen(false);
    openerRef.current?.focus();
  };
  const closeSheetRef = useRef(closeSheet);
  useEffect(() => {
    closeSheetRef.current = closeSheet;
  });
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheetRef.current();
    };
    // The sheet exists on phones only: a wider window (a turned tablet) closes it rather than leave the page locked.
    const wide = window.matchMedia(CONSOLE_QUERY);
    const onWide = () => {
      if (wide.matches) setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [sheetOpen]);

  // ── The controls, shared by the console and the sheet ──

  const modeSwitch = (wide: boolean) => (
    <div className="sa-seg" role="group">
      {(
        [
          [undefined, "Активни"],
          ["past", "Приключили"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={label}
          type="button"
          aria-pressed={draft.status === value}
          onClick={() => setInstant("status", value)}
          className={wide ? undefined : "flex-[1_1_0]"}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const searchField = (className = "") => (
    <label className={`sa-fld ${className}`}>
      <span className="sa-lbl">Търсене по лот № / VIN</span>
      <span className="sa-inw">
        <SearchIcon />
        <input
          className="sa-in font-mono placeholder:font-sans"
          type="text"
          placeholder="Въведете лот номер или VIN…"
          value={draft.search ?? ""}
          onChange={(e) => setDebounced("search", e.target.value || undefined)}
        />
      </span>
    </label>
  );

  const comboField = (label: string, control: ReactNode, className = "") => (
    <div className={`sa-fld ${className}`}>
      <span className="sa-lbl">{label}</span>
      {control}
    </div>
  );

  const makeField = (className = "") =>
    comboField(
      "Марка",
      <Combobox
        plates
        aria-label="Марка"
        options={[
          { value: "", label: "Всички марки" },
          ...facets.brands.map((b) => ({ value: b.value, label: b.label, logo: b.logo ?? null })),
        ]}
        value={draft.brand != null ? String(draft.brand) : ""}
        onValueChange={(v) => setInstant("brand", v ? Number(v) : undefined)}
        searchPlaceholder="Търсене на марка…"
      />,
      className,
    );

  const modelField = (className = "") =>
    comboField(
      "Модел",
      <Combobox
        aria-label="Модел"
        options={[
          { value: "", label: draft.brand === undefined ? "Първо изберете марка" : "Всички модели" },
          ...models.map((m) => ({ value: m.value, label: m.label })),
        ]}
        value={draft.model != null ? String(draft.model) : ""}
        disabled={draft.brand === undefined}
        onValueChange={(v) => setInstant("model", v ? Number(v) : undefined)}
        searchPlaceholder="Търсене на модел…"
      />,
      className,
    );

  const typeField = (className = "") =>
    comboField(
      "Тип",
      <Combobox
        aria-label="Тип"
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
      />,
      className,
    );

  const numberField = (
    label: string,
    key: "priceMin" | "priceMax" | "yearFrom" | "yearTo",
    placeholder: string,
    className = "",
  ) => (
    <label className={`sa-fld ${className}`}>
      <span className="sa-lbl">{label}</span>
      <input
        className="sa-in"
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={draft[key] ?? ""}
        onChange={(e) => setDebounced(key, numOrUndef(e.target.value))}
      />
    </label>
  );

  /** Пазар: a segmented control in the console, 2×2 chips in the sheet. */
  const marketField = (inSheet: boolean) => (
    <div className="sa-fld">
      <span className="sa-lbl">Пазар</span>
      <div className={inSheet ? "sa-chips grid grid-cols-2" : "sa-seg"} role="group" aria-label="Пазар">
        {MARKETS.map((m) => {
          const Icon = m.Icon;
          return (
            <button
              key={m.label}
              type="button"
              aria-pressed={draft.market === m.value}
              onClick={() => setInstant("market", m.value)}
              className={inSheet ? "sa-chip justify-center" : undefined}
            >
              {/* In a chip the kit sizes icons 16 px; a flag keeps its 3:2 there, as the board draws it. */}
              {Icon ? <Icon className={inSheet ? "sa-flag h-3.5 w-5.25" : "sa-flag"} /> : <EarthIcon />}
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const buyNowSwitch = (className = "") => (
    <label className={`sa-sw ${className}`}>
      <input
        type="checkbox"
        checked={draft.channel === "buy-now"}
        onChange={(e) => setInstant("channel", e.target.checked ? "buy-now" : undefined)}
      />
      <span className="sa-sw__t" aria-hidden="true" />
      Само с Buy Now
    </label>
  );

  // Auction-timing window (instant) — ACTIVE view only. Hidden on the past tab, where every lot has concluded and a
  // future-date window is moot.
  const auctionField = () =>
    isPast ? null : (
      <div className="sa-fld">
        <span className="sa-lbl">Търг</span>
        <div className="sa-chips" role="group" aria-label="Търг">
          {AUCTION_WINDOWS.map((w) => (
            <button
              key={w.label}
              type="button"
              className="sa-chip"
              aria-pressed={draft.auctionWindow === w.value}
              onClick={() => setInstant("auctionWindow", w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
    );

  const secondaryFields = () => (
    <>
      {comboField(
        "Гориво",
        <Combobox
          aria-label="Гориво"
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
        />,
      )}
      {comboField(
        "Задвижване",
        <Combobox
          aria-label="Задвижване"
          options={[{ value: "", label: "Всички" }, ...facets.drives.map((d) => ({ value: d.value, label: d.label }))]}
          value={draft.drive ?? ""}
          onValueChange={(v) => setInstant("drive", v || undefined)}
        />,
      )}
      {comboField(
        "Състояние",
        <Combobox
          aria-label="Състояние"
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
        />,
      )}
      {comboField(
        "Цвят",
        <Combobox
          aria-label="Цвят"
          options={[{ value: "", label: "Всички цветове" }, ...facets.colors.map((c) => ({ value: c.value, label: c.label }))]}
          value={draft.color ?? ""}
          onValueChange={(v) => setInstant("color", v || undefined)}
        />,
      )}
    </>
  );

  // The sheet's bottom button: the live count („Вижте 1 автомобил"), a spinner in its place while the results update,
  // „Вижте резултатите" for a lot / VIN search, which has no count.
  const sheetButtonLabel =
    count === null ? (
      "Вижте резултатите"
    ) : pending ? (
      <>
        Вижте
        <span className="sa-spin" aria-hidden="true" />
        автомобила
      </>
    ) : count === 1 ? (
      "Вижте 1 автомобил"
    ) : (
      `Вижте ${count.toLocaleString("bg-BG")} автомобила`
    );

  return (
    <>
      {/* ── Tablet and desktop: the console ── */}
      <div className="hidden rounded-lg border border-hair bg-s1 sm:block">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3.5 border-b border-hair px-[clamp(16px,1.6vw,24px)] py-4">
          {modeSwitch(true)}
          {searchField("order-3 basis-full lg:order-0 lg:max-w-130 lg:flex-[1_1_320px]")}
          <Button variant="sec" className="ml-auto" disabled={appliedCount === 0} onClick={onReset}>
            Изчистете филтрите
            <CountBadge n={appliedCount} />
          </Button>
        </div>

        <div className="flex flex-col gap-5 px-[clamp(16px,1.6vw,24px)] pt-5 pb-6">
          <div className="grid grid-cols-12 gap-4 min-[90rem]:grid-cols-[repeat(3,minmax(0,2.4fr))_repeat(4,minmax(0,1fr))]">
            {makeField("col-span-6 lg:col-span-4 min-[90rem]:col-span-1")}
            {modelField("col-span-6 lg:col-span-4 min-[90rem]:col-span-1")}
            {typeField("col-span-4 min-[90rem]:col-span-1")}
            {numberField("Цена от ($)", "priceMin", "0", "col-span-2 lg:col-span-3 min-[90rem]:col-span-1")}
            {numberField("Цена до ($)", "priceMax", "∞", "col-span-2 lg:col-span-3 min-[90rem]:col-span-1")}
            {numberField("Година от", "yearFrom", "1990", "col-span-2 lg:col-span-3 min-[90rem]:col-span-1")}
            {numberField("Година до", "yearTo", "2027", "col-span-2 lg:col-span-3 min-[90rem]:col-span-1")}
          </div>

          <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
            {marketField(false)}
            {buyNowSwitch("h-12")}
            {auctionField()}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-hair pt-5 lg:grid-cols-4">{secondaryFields()}</div>
        </div>
      </div>

      {/* ── Phone: the tab and „Филтри" ── */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        {modeSwitch(false)}
        <Button
          ref={openerRef}
          variant="sec"
          block
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontalIcon />
          Филтри
          <CountBadge n={appliedCount} />
        </Button>
      </div>

      {/* ── Phone: the sheet. Filters apply as they change; the bottom button only closes it. ── */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-10045 sm:hidden">
          <div className="sa-scrim" onClick={closeSheet} />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
            tabIndex={-1}
            className="sa-sheet top-3.5 max-h-none outline-none"
          >
            <div className="flex flex-none items-center gap-1.5 border-b border-hair pt-1.5 pr-2 pb-2.5 pl-4">
              <h2 id={sheetTitleId} className="mr-auto font-display text-lg leading-[1.2] font-bold tracking-[-0.01em]">
                Филтри
              </h2>
              <Button variant="txt" size="md" disabled={appliedCount === 0} onClick={onReset}>
                Изчистете филтрите
                <CountBadge n={appliedCount} />
              </Button>
              <IconButton label="Затворете" variant="ghost" onClick={closeSheet}>
                <CloseIcon />
              </IconButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="flex flex-col gap-4 p-4">
                {searchField()}
                {makeField()}
                {modelField()}
                {typeField()}
                <div className="grid grid-cols-2 gap-3">
                  {numberField("Цена от ($)", "priceMin", "0")}
                  {numberField("Цена до ($)", "priceMax", "∞")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {numberField("Година от", "yearFrom", "1990")}
                  {numberField("Година до", "yearTo", "2027")}
                </div>
                {marketField(true)}
                {buyNowSwitch()}
                {auctionField()}
                {secondaryFields()}
              </div>
            </div>

            <div className="flex-none border-t border-hair2 bg-s1 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <Button variant="pri" block aria-busy={pending || undefined} onClick={closeSheet}>
                {sheetButtonLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
