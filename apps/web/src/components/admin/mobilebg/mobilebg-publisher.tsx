"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Combobox, ConfirmDialog } from "@/components/common";
import { carTitle } from "@/lib/mobilebg/car-title";
import { PRICE_DDS_OPTIONS } from "@/lib/mobilebg/price-dds";
import type { MobilebgOverrides } from "@/lib/mobilebg/map-car";
import {
  lookupCarAction,
  previewAdvertAction,
  publishCarToMobilebg,
  saveMobilebgBrandMapping,
  saveMobilebgModelMapping,
} from "@/mutations/mobilebg";
import type { CarLookupHit, MobilebgPreview } from "@/queries/mobilebg";

/**
 * Търси → преглед → публикувай.
 *
 * The PREVIEW step is the point of this screen. mobile.bg charges a dealer for
 * every week an advert stays active (Общи условия I.16), and a wrong-but-valid
 * value (the wrong model) is accepted and files the advert where nobody looks.
 * So nothing is sent until an admin has seen the exact payload, how the brand
 * and model were resolved, the price with its derivation, and every field we
 * could not fill.
 *
 * Brand/model resolve automatically against mobile.bg's live vocabulary; when
 * they cannot, the pickers here are where the admin chooses — once for the model
 * everywhere („запомни“), or just for this advert when the right answer depends
 * on the car's version (BMW „3er“ is „320“ or „330“ depending on the engine).
 *
 * The other overrides are fields our data genuinely cannot supply, three of them
 * REQUIRED by mobile.bg: production month (we store only the year), the VAT
 * status of the price (a public tax statement, so never defaulted), the country
 * (every advert is „Извън страната“; the country comes from the lot and can be
 * changed) and the category (from the body type, picked by hand when our data
 * has none). Changing any of them recomputes the preview at once, so the
 * blocker it resolves clears. Opening another car clears the per-car choices.
 */

const MONTHS = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
];

function markaProvenance(p: MobilebgPreview): string {
  switch (p.mapping.markaSource) {
    case "manual":
      return "ръчно съответствие";
    case "exact":
      return "същото име";
    case "alias":
      return `известен синоним на „${p.source.brandName ?? "—"}“`;
    default:
      return "";
  }
}

function modelProvenance(p: MobilebgPreview): string {
  const evidence = p.mapping.modelEvidence ?? "";
  switch (p.mapping.modelSource) {
    case "override":
      return "избран за тази обява";
    case "manual":
      return "ръчно съответствие";
    case "exact":
      return "същото име";
    case "brand-prefixed":
      return `под марката на mobile.bg („${evidence}“)`;
    case "variant":
      return `от името „${p.source.modelName ?? "—"}“, потвърдено от заглавието`;
    case "title":
      return `от заглавието („${evidence}“)`;
    case "family":
      return `семейство („${evidence}“)`;
    default:
      return "";
  }
}

export function MobilebgPublisher() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CarLookupHit[]>([]);
  const [preview, setPreview] = useState<MobilebgPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  // Admin-supplied fields — see the note above on why each one exists.
  const [month, setMonth] = useState("");
  const [locatc, setLocatc] = useState("");
  const [term, setTerm] = useState("35");
  const [priceOverride, setPriceOverride] = useState("");
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [extraExtri, setExtraExtri] = useState("");
  const [extinfo, setExtinfo] = useState("");
  const [priceDds, setPriceDds] = useState("");
  const [category, setCategory] = useState("");

  // Brand/model pickers.
  const [modelOverride, setModelOverride] = useState("");
  const [pickedMarka, setPickedMarka] = useState("");
  const [pickedModel, setPickedModel] = useState("");
  const [rememberModel, setRememberModel] = useState(true);
  const [changingModel, setChangingModel] = useState(false);

  function overrides(): MobilebgOverrides {
    const parsedPrice = Number(priceOverride.replace(",", "."));
    return {
      month: month || undefined,
      locatc: locatc.trim() || undefined,
      term,
      priceEur: priceOverride.trim() && Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      priceOnRequest: priceOnRequest || undefined,
      extri: extraExtri
        .split(/[~/]/)
        .map((s) => s.trim())
        .filter(Boolean),
      extinfo: extinfo.trim() || undefined,
      model: modelOverride || undefined,
      priceDds: priceDds || undefined,
      category: category || undefined,
    };
  }

  /** `over` is explicit because state set just before a load has not applied yet. */
  function load(carId: number, over: MobilebgOverrides = overrides()) {
    setError(null);
    startTransition(async () => {
      const res = await previewAdvertAction(carId, over);
      if (!res.success) {
        setError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res.data);
      setPickedMarka("");
      setPickedModel(res.data.mapping.model ?? "");
      setChangingModel(false);
    });
  }

  /**
   * A different car: nothing chosen for the previous car may carry over (its
   * month, category, country, price or description would silently land on this
   * one). Only the advert-policy fields stay: VAT status and validity.
   */
  function openCar(carId: number) {
    setModelOverride("");
    setMonth("");
    setLocatc("");
    setCategory("");
    setPriceOverride("");
    setPriceOnRequest(false);
    setExtraExtri("");
    setExtinfo("");
    load(carId, { term, priceDds: priceDds || undefined });
  }

  function search() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setNotice(null);
    setPreview(null);
    startTransition(async () => {
      const res = await lookupCarAction(q);
      if (!res.success) {
        setError(res.error);
        setHits([]);
        return;
      }
      setHits(res.data);
      if (res.data.length === 0) setError("Няма намерен автомобил по този ID / VIN / номер на лот / линк.");
      else if (res.data.length === 1) openCar(res.data[0].carId);
    });
  }

  /** Recompute against the current overrides — the preview must stay truthful. */
  function refresh() {
    if (preview) load(preview.source.carId);
  }

  /** Apply one override and recompute at once, so a blocker it resolves clears. */
  function reloadWith(patch: Partial<MobilebgOverrides>) {
    if (preview) load(preview.source.carId, { ...overrides(), ...patch });
  }

  function saveBrand() {
    if (!preview || !pickedMarka) return;
    const { carId, manufacturerExternalId } = preview.source;
    if (manufacturerExternalId === null) {
      setError("Автомобилът няма марка в нашия справочник — съответствие не може да се запомни.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveMobilebgBrandMapping({ manufacturerExternalId, marka: pickedMarka });
      if (!res.success) {
        setError(res.error);
        return;
      }
      load(carId);
    });
  }

  function applyModel() {
    if (!preview || !pickedModel || !preview.mapping.marka) return;
    const { carId, modelExternalId, manufacturerExternalId } = preview.source;
    const marka = preview.mapping.marka;
    setError(null);

    if (rememberModel && modelExternalId !== null && manufacturerExternalId !== null) {
      startTransition(async () => {
        const res = await saveMobilebgModelMapping({
          modelExternalId,
          manufacturerExternalId,
          marka,
          model: pickedModel,
        });
        if (!res.success) {
          setError(res.error);
          return;
        }
        setModelOverride("");
        load(carId, { ...overrides(), model: undefined });
      });
      return;
    }

    setModelOverride(pickedModel);
    load(carId, { ...overrides(), model: pickedModel });
  }

  function confirmPublish() {
    setConfirming(false);
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await publishCarToMobilebg({
        carId: preview.source.carId,
        overrides: overrides(),
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      const skipped =
        res.data.skippedPictures.length > 0
          ? ` Пропуснати снимки: ${res.data.skippedPictures.length}.`
          : "";
      setNotice(
        `${res.data.edited ? "Обявата е коригирана" : "Обявата е публикувана"} — ID ${res.data.ida}, ` +
          `${res.data.pictureCount} снимки.${skipped}`,
      );
      load(preview.source.carId);
      router.refresh();
    });
  }

  const mapped = preview?.mapped;
  const mapping = preview?.mapping;
  const blockers = mapped?.blockers ?? [];
  const missing = mapped?.missing ?? [];
  const missingFields = new Set(missing.map((m) => m.field));
  const invalid = preview?.invalidValues ?? [];
  const canPublish =
    Boolean(preview) &&
    blockers.length === 0 &&
    missing.length === 0 &&
    invalid.length === 0 &&
    Boolean(preview?.credentialsConfigured);
  const showModelPicker =
    Boolean(mapping?.marka) && (!mapping?.model || changingModel) && (mapping?.modelOptions.length ?? 0) > 0;
  // What the advert will carry: the admin's pick, else what the mapper derived.
  const effectiveCountry = locatc || mapped?.params.locatc || "";
  const countryChoices = [
    { value: "", label: "Изберете" },
    ...(preview?.countryOptions.length ? preview.countryOptions : effectiveCountry ? [effectiveCountry] : []).map(
      (c) => ({ value: c, label: c }),
    ),
  ];
  const effectiveCategory = category || mapped?.params.category || "";
  const categoryChoices = [
    { value: "", label: "Изберете" },
    ...(preview?.categoryOptions.length ? preview.categoryOptions : effectiveCategory ? [effectiveCategory] : []).map(
      (c) => ({ value: c, label: c }),
    ),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <label htmlFor="mobilebg-q" className="mb-1 block text-sm font-semibold text-ink">
          ID на автомобил, VIN, номер на лот или линк към обявата
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="mobilebg-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="напр. 50290 или https://www.selectauto.bg/avtomobil/50290"
            className="h-10 min-w-64 flex-1 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={search}
            disabled={pending || !query.trim()}
            className="h-10 rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {pending ? "Търси…" : "Търси"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      {hits.length > 1 && !preview && (
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-2 font-bold text-ink">Изберете автомобил</h2>
          <ul className="space-y-1">
            {hits.map((h) => (
              <li key={h.carId}>
                <button
                  type="button"
                  onClick={() => openCar(h.carId)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-neutral-100"
                >
                  <span className="font-semibold">{carTitle(h.year, h.title, h.carId)}</span>
                  <span className="text-muted">
                    {" "}
                    · #{h.carId}
                    {h.lotNumber ? ` · лот ${h.lotNumber}` : ""}
                    {h.domainName ? ` · ${h.domainName}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && mapping && (
        <div className="space-y-4 rounded-2xl border border-line bg-white p-4">
          <div>
            <h2 className="font-bold text-ink">
              {carTitle(preview.source.year, preview.source.title, preview.source.carId)}
            </h2>
            <p className="text-sm text-muted">
              #{preview.source.carId}
              {preview.source.vin ? ` · VIN ${preview.source.vin}` : ""}
              {preview.source.lotNumber ? ` · лот ${preview.source.lotNumber}` : ""}
              {" · "}
              {preview.source.images.length} снимки
            </p>
          </div>

          {!preview.credentialsConfigured && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Акаунтът за импорт в mobile.bg още не е конфигуриран. Обявата се изчислява напълно, но
              не може да бъде изпратена.
            </p>
          )}

          {/* Brand / model — resolved automatically, with the evidence shown. */}
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold text-ink">Марка и модел в mobile.bg</p>
            {mapping.unavailable ? (
              <p className="mt-1 text-sm text-[#b3261e]">
                Речникът на mobile.bg не отговаря — съответствието не може да бъде проверено.
                Опитайте „Преизчисли“ след малко.
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm text-ink">
                <li>
                  Марка: <strong>{mapping.marka ?? "—"}</strong>
                  {mapping.marka && <span className="text-muted"> — {markaProvenance(preview)}</span>}
                </li>
                <li>
                  Модел: <strong>{mapping.model ?? "—"}</strong>
                  {mapping.model && <span className="text-muted"> — {modelProvenance(preview)}</span>}
                  {mapping.model && !changingModel && (
                    <button
                      type="button"
                      onClick={() => setChangingModel(true)}
                      className="ml-2 text-xs font-bold text-brand"
                    >
                      промени
                    </button>
                  )}
                </li>
              </ul>
            )}

            {!mapping.marka && mapping.markaOptions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                  <label className="mb-1 block text-xs font-semibold text-muted">
                    Марката „{preview.source.brandName ?? "—"}“ в mobile.bg е:
                  </label>
                  <Combobox
                    options={[
                      { value: "", label: "— изберете —" },
                      ...mapping.markaOptions.map((m) => ({ value: m, label: m })),
                    ]}
                    value={pickedMarka}
                    onValueChange={setPickedMarka}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveBrand}
                  disabled={pending || !pickedMarka}
                  className="h-11 rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-40"
                >
                  Запомни марката
                </button>
              </div>
            )}

            {showModelPicker && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-56 flex-1">
                    <label className="mb-1 block text-xs font-semibold text-muted">
                      Моделът „{preview.source.modelName ?? "—"}“ в mobile.bg е:
                    </label>
                    <Combobox
                      options={[
                        { value: "", label: "— изберете —" },
                        ...mapping.modelOptions.map((m) => ({ value: m, label: m })),
                      ]}
                      value={pickedModel}
                      onValueChange={setPickedModel}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyModel}
                    disabled={pending || !pickedModel}
                    className="h-11 rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Използвай
                  </button>
                </div>
                {preview.source.modelExternalId !== null && (
                  <label className="flex items-start gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={rememberModel}
                      onChange={(e) => setRememberModel(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Запомни за всички коли с модел „{preview.source.modelName ?? "—"}“. Махнете
                      отметката, ако зависи от версията — напр. BMW „3er“ е „320“ или „330“ според
                      двигателя.
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {blockers.length > 0 && (
            <div className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">
              <p className="mb-1 font-bold">Публикуването е спряно:</p>
              <ul className="list-disc space-y-1 pl-5">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Not a fault with the car: required choices the admin still has to make. */}
          {missing.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="mb-1 font-bold">Попълнете, за да публикувате:</p>
              <ul className="list-disc space-y-1 pl-5">
                {missing.map((m) => (
                  <li key={m.field}>{m.message}</li>
                ))}
              </ul>
            </div>
          )}

          {invalid.length > 0 && (
            <div className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">
              <p className="mb-1 font-bold">Стойности, които mobile.bg не разпознава:</p>
              <ul className="list-disc space-y-1 pl-5">
                {invalid.map((v) => (
                  <li key={`${v.field}:${v.value}`}>
                    <code>{v.field}</code> = „{v.value}“
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price — always shown with its derivation, never as a bare number. */}
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold text-ink">Цена в обявата</p>
            <p className="text-sm text-muted">
              Себестойност до България:{" "}
              {mapped?.landedEur ? `${mapped.landedEur.toLocaleString("bg-BG")} €` : "—"}
              {" · надценка "}
              {preview.markupPct}%{" → "}
              <strong className="text-ink">
                {mapped?.computedPriceEur
                  ? `${mapped.computedPriceEur.toLocaleString("bg-BG")} €`
                  : "цена при запитване"}
              </strong>
            </p>
            <p className="mt-1 text-xs text-muted">
              Аукционната цена на лота е{" "}
              {preview.source.priceUsd
                ? `${Math.round(preview.source.priceUsd).toLocaleString("bg-BG")} $`
                : "— (лотът още няма наддаване или „Купи сега“)"}{" "}
              и НЕ се публикува — тя не включва транспорт, мито, ДДС и такси.
            </p>
          </div>

          {mapped && mapped.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="mb-1 font-bold">За проверка:</p>
              <ul className="list-disc space-y-1 pl-5">
                {mapped.warnings.map((w) => (
                  <li key={`${w.field}:${w.message}`}>
                    <code>{w.field}</code> — {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fields our data cannot supply. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Месец на производство</label>
              <Combobox
                options={[
                  { value: "", label: "Изберете" },
                  ...MONTHS.map((m) => ({ value: m, label: m })),
                ]}
                value={month}
                onValueChange={(v) => {
                  setMonth(v);
                  reloadWith({ month: v || undefined });
                }}
              />
              {missingFields.has("month") && <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                Валидност (дни) — за дилъри е само статистика
              </label>
              <Combobox
                options={[
                  { value: "35", label: "35 дни" },
                  { value: "49", label: "49 дни" },
                ]}
                value={term}
                onValueChange={setTerm}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Категория</label>
              <Combobox
                options={categoryChoices}
                value={effectiveCategory}
                onValueChange={(v) => {
                  setCategory(v);
                  reloadWith({ category: v || undefined });
                }}
              />
              {missingFields.has("category") && <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Държава (извън страната)</label>
              <Combobox
                options={countryChoices}
                value={effectiveCountry}
                onValueChange={(v) => {
                  setLocatc(v);
                  reloadWith({ locatc: v || undefined });
                }}
              />
              {missingFields.has("locatc") && <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">ДДС статус на цената</label>
              <Combobox
                options={[
                  { value: "", label: "Изберете" },
                  ...PRICE_DDS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                ]}
                value={priceDds}
                onValueChange={(v) => {
                  setPriceDds(v);
                  reloadWith({ priceDds: v || undefined });
                }}
              />
              {missingFields.has("price_dds") && <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително</p>}
            </div>
            <TextField
              label="Цена (EUR) — ръчно"
              value={priceOverride}
              onChange={setPriceOverride}
              placeholder="празно = изчислената"
            />
            <TextField
              label="Допълнителни екстри (разделени с /)"
              value={extraExtri}
              onChange={setExtraExtri}
              placeholder="Кожен салон/Парктроник/7 места"
            />
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={priceOnRequest}
                  onChange={(e) => setPriceOnRequest(e.target.checked)}
                />
                Цена при запитване
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Описание (extinfo)</label>
            <textarea
              value={extinfo}
              onChange={(e) => setExtinfo(e.target.value)}
              rows={4}
              placeholder={mapped?.params.extinfo ?? ""}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <p className="mt-1 text-xs text-muted">
              Празно = генерираното описание (показано като плейсхолдър).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={pending}
              className="h-10 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink disabled:opacity-40"
            >
              Преизчисли
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending || !canPublish}
              className="h-10 rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              {preview.advert?.ida ? "Коригирай обявата" : "Публикувай в mobile.bg"}
            </button>
            {preview.unchanged && (
              <span className="self-center text-sm text-muted">Няма промени спрямо публикуваното.</span>
            )}
          </div>

          {/* The exact wire format — the whole point of a preview. */}
          {mapped && Object.keys(mapped.params).length > 0 && (
            <details className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-bold text-ink">
                Параметри към advertpub ({Object.keys(mapped.params).length})
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-120 text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                      <th className="px-2 py-1 font-bold">Поле</th>
                      <th className="px-2 py-1 font-bold">Описание</th>
                      <th className="px-2 py-1 font-bold">Стойност</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mapped.params).map(([k, v]) => (
                      <tr key={k} className="border-b border-line/60 last:border-0">
                        <td className="px-2 py-1 font-mono text-xs text-ink">{k}</td>
                        <td className="px-2 py-1 text-muted">{preview.catfields[k]?.ftext ?? "—"}</td>
                        <td className="px-2 py-1 whitespace-pre-wrap text-ink">{v || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirming}
        tone="danger"
        title={preview?.advert?.ida ? "Корекция на обява" : "Публикуване на обява"}
        confirmLabel={preview?.advert?.ida ? "Коригирай" : "Публикувай"}
        isPending={pending}
        onConfirm={confirmPublish}
        onCancel={() => setConfirming(false)}
        message={
          preview?.advert?.ida ? (
            <>
              Обявата ще бъде обновена в mobile.bg (ID {preview.advert.ida}). Корекциите са
              безплатни (Общи условия, т. I.15).
            </>
          ) : (
            <>
              Ще бъде създадена НОВА обява в mobile.bg. Докато е активна, mobile.bg начислява
              седмична такса по дилърската тарифа (т. I.16) — обявата не изтича сама, а стои до
              изтриване. Цената в обявата ще бъде{" "}
              <strong>
                {mapped?.computedPriceEur
                  ? `${mapped.computedPriceEur.toLocaleString("bg-BG")} €`
                  : "„при запитване“"}
              </strong>
              .
            </>
          )
        }
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-brand"
      />
    </div>
  );
}
