"use client";

import { ADMIN_HINT, ADMIN_INPUT, ADMIN_LABEL, AdminBanner, AdminButton } from "@/components/admin/ui";
import { Combobox, ConfirmDialog } from "@/components/common";
import { ChevronDownIcon } from "@/components/icons";
import { advertUrl } from "@/lib/mobilebg/advert-url";
import { BATTERY_ENGINE_TYPES, parseBatteryKm, parseBatteryKwh } from "@/lib/mobilebg/battery";
import { carTitle } from "@/lib/mobilebg/car-title";
import type { MobilebgOverrides } from "@/lib/mobilebg/map-car";
import { parseManualPrice } from "@/lib/mobilebg/parse-price";
import { PRICE_DDS_OPTIONS } from "@/lib/mobilebg/price-dds";
import {
  lookupCarAction,
  previewAdvertAction,
  publishCarToMobilebg,
  saveMobilebgBrandMapping,
  saveMobilebgModelMapping,
} from "@/mutations/mobilebg";
import type { CarLookupHit, MobilebgPreview } from "@/queries/mobilebg";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

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
 * has none). Electric cars and plug-in hybrids add two more: the WLTP range and
 * the battery capacity (lib/mobilebg/battery.ts). Changing any of them
 * recomputes the preview at once, so the blocker it resolves clears. Opening
 * another car clears the per-car choices.
 */

const MONTHS = [
  "януари",
  "февруари",
  "март",
  "април",
  "май",
  "юни",
  "юли",
  "август",
  "септември",
  "октомври",
  "ноември",
  "декември",
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
  const uid = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CarLookupHit[]>([]);
  const [preview, setPreview] = useState<MobilebgPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; url?: string } | null>(null);
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
  // Electric cars and plug-in hybrids only: mobile.bg requires both, our data has neither.
  const [batteryKm, setBatteryKm] = useState("");
  const [batteryKwh, setBatteryKwh] = useState("");

  // Brand/model pickers.
  const [modelOverride, setModelOverride] = useState("");
  const [pickedMarka, setPickedMarka] = useState("");
  const [pickedModel, setPickedModel] = useState("");
  const [rememberModel, setRememberModel] = useState(true);
  const [changingModel, setChangingModel] = useState(false);

  // „28 500" and „28.500" are how people here type prices; an unreadable value
  // blocks publishing instead of silently falling back to the calculated price.
  const manualPrice = parseManualPrice(priceOverride);
  const batteryKmInput = parseBatteryKm(batteryKm);
  const batteryKwhInput = parseBatteryKwh(batteryKwh);
  // A typed value that cannot be read must stop publishing, never be dropped.
  const hasInvalidInput =
    manualPrice.kind === "invalid" || batteryKmInput.kind === "invalid" || batteryKwhInput.kind === "invalid";

  /**
   * Every server call goes through here. A dropped connection rejects the call,
   * and inside a transition that rejection used to reach the page's error
   * boundary — the whole screen replaced by „Нещо се обърка". Say it in place.
   */
  function run(task: () => Promise<void>, lost = "Връзката със сървъра прекъсна. Опитайте отново.") {
    startTransition(async () => {
      try {
        await task();
      } catch {
        setError(lost);
      }
    });
  }

  function overrides(): MobilebgOverrides {
    return {
      month: month || undefined,
      locatc: locatc.trim() || undefined,
      term,
      priceEur: manualPrice.kind === "ok" ? manualPrice.eur : undefined,
      priceOnRequest: priceOnRequest || undefined,
      extri: extraExtri
        .split(/[~/]/)
        .map((s) => s.trim())
        .filter(Boolean),
      extinfo: extinfo.trim() || undefined,
      model: modelOverride || undefined,
      priceDds: priceDds || undefined,
      category: category || undefined,
      batteryKm: batteryKmInput.kind === "ok" ? batteryKmInput.value : undefined,
      batteryKwh: batteryKwhInput.kind === "ok" ? batteryKwhInput.value : undefined,
    };
  }

  /** `over` is explicit because state set just before a load has not applied yet. */
  function load(carId: number, over: MobilebgOverrides = overrides()) {
    setError(null);
    run(async () => {
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
   * month, category, country, price, battery or description would silently land
   * on this one). Only the advert-policy fields stay: VAT status and validity.
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
    setBatteryKm("");
    setBatteryKwh("");
    load(carId, { term, priceDds: priceDds || undefined });
  }

  function search() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setNotice(null);
    setPreview(null);
    run(async () => {
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

  /**
   * Recompute with everything as typed, THEN ask for confirmation. The dialog
   * states the price from this fresh preview, so it is the exact `price` that will
   * be sent, never an older calculation.
   */
  function openConfirm() {
    if (!preview || hasInvalidInput) return;
    const carId = preview.source.carId;
    setError(null);
    run(async () => {
      const res = await previewAdvertAction(carId, overrides());
      if (!res.success) {
        setError(res.error);
        return;
      }
      setPreview(res.data);
      const p = res.data;
      if (p.unchanged) {
        setError("Няма промени спрямо публикуваното.");
        return;
      }
      if (
        p.mapped.blockers.length > 0 ||
        p.mapped.missing.length > 0 ||
        p.invalidValues.length > 0 ||
        !p.credentialsConfigured
      ) {
        return;
      }
      setConfirming(true);
    });
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
    run(async () => {
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
      run(async () => {
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
    run(async () => {
      const res = await publishCarToMobilebg({
        carId: preview.source.carId,
        overrides: overrides(),
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      const skipped =
        res.data.skippedPictures.length > 0 ? ` Пропуснати снимки: ${res.data.skippedPictures.length}.` : "";
      setNotice({
        text: `${res.data.edited ? "Обявата е коригирана" : "Обявата е публикувана"}: ID ${res.data.ida}, ${res.data.pictureCount} снимки.${skipped}`,
        url: advertUrl(res.data.ida),
      });
      load(preview.source.carId);
      router.refresh();
    }, "Връзката прекъсна, докато обявата се изпращаше — проверете „Обяви“ по-долу, преди да опитате отново.");
  }

  const mapped = preview?.mapped;
  const mapping = preview?.mapping;
  const blockers = mapped?.blockers ?? [];
  const missing = mapped?.missing ?? [];
  const missingFields = new Set(missing.map((m) => m.field));
  const invalid = preview?.invalidValues ?? [];
  // mobile.bg rejects an electric car or plug-in hybrid without range and capacity.
  const needsBattery = BATTERY_ENGINE_TYPES.has(mapped?.params.engine_type ?? "");
  const canPublish =
    Boolean(preview) &&
    !hasInvalidInput &&
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

  // What an action said: next to the search before a car is open, in the
  // action bar once one is — on a phone, the top of the page is a long way
  // from the publish button that caused it.
  const feedback =
    error || notice ? (
      <div className="flex flex-col gap-2">
        {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
        {notice ? (
          <AdminBanner tone="success">
            {notice.text}{" "}
            {notice.url && (
              <a href={notice.url} target="_blank" rel="noreferrer" className="font-bold underline">
                Виж обявата в mobile.bg
              </a>
            )}
          </AdminBanner>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="rounded-xl border border-line bg-white p-4"
      >
        <label htmlFor="mobilebg-q" className={`mb-1 block ${ADMIN_LABEL}`}>
          ID на автомобил, VIN, номер на лот или линк към обявата
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="mobilebg-q"
            type="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="напр. 50290 или https://www.selectauto.bg/avtomobil/50290"
            className={ADMIN_INPUT}
          />
          <AdminButton type="submit" variant="primary" disabled={pending || !query.trim()} className="shrink-0">
            {pending ? "Търси…" : "Търси"}
          </AdminButton>
        </div>
      </form>

      {!preview ? feedback : null}

      {hits.length > 1 && !preview && (
        <div className="rounded-xl border border-line bg-white p-4">
          <h2 className="mb-2 font-bold text-ink">Изберете автомобил</h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {hits.map((h) => (
              <li key={h.carId}>
                <button
                  type="button"
                  onClick={() => openCar(h.carId)}
                  className="flex min-h-11 w-full flex-col justify-center rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="font-semibold">{carTitle(h.year, h.title, h.carId)}</span>
                  <span className="text-muted">
                    #{h.carId}
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
        <div className="@container flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="font-bold wrap-anywhere text-ink">
              {carTitle(preview.source.year, preview.source.title, preview.source.carId)}
            </h2>
            <p className="text-sm wrap-anywhere text-muted">
              #{preview.source.carId}
              {preview.source.vin ? ` · VIN ${preview.source.vin}` : ""}
              {preview.source.lotNumber ? ` · лот ${preview.source.lotNumber}` : ""}
              {" · "}
              {preview.source.images.length} снимки
            </p>
            {preview.advert?.ida && (
              <a
                href={advertUrl(preview.advert.ida)}
                target="_blank"
                rel="noreferrer"
                className="-my-2 inline-block py-2 text-sm font-bold text-brand hover:underline"
              >
                Обявата в mobile.bg (ID {preview.advert.ida})
              </a>
            )}
          </div>

          {!preview.credentialsConfigured && (
            <AdminBanner tone="warning">
              Акаунтът за импорт в mobile.bg още не е конфигуриран. Обявата се изчислява напълно, но не може да бъде
              изпратена.
            </AdminBanner>
          )}

          {/* Brand / model — resolved automatically, with the evidence shown. */}
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold text-ink">Марка и модел в mobile.bg</p>
            {mapping.unavailable ? (
              <p className="mt-1 text-sm text-[#b3261e]">
                Речникът на mobile.bg не отговаря — съответствието не може да бъде проверено. Опитайте „Преизчисли“ след
                малко.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5 text-sm text-ink">
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
                      className="-my-2 ml-1 inline-flex min-h-10 items-center rounded-md px-1.5 text-sm font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      промени
                    </button>
                  )}
                </li>
              </ul>
            )}

            {!mapping.marka && mapping.markaOptions.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 @lg:flex-row @lg:items-end">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-semibold text-muted">
                    Марката „{preview.source.brandName ?? "—"}“ в mobile.bg е:
                  </p>
                  <Combobox
                    aria-label={`Марката „${preview.source.brandName ?? "—"}“ в mobile.bg`}
                    options={[
                      { value: "", label: "— изберете —" },
                      ...mapping.markaOptions.map((m) => ({ value: m, label: m })),
                    ]}
                    value={pickedMarka}
                    onValueChange={setPickedMarka}
                  />
                </div>
                <AdminButton variant="primary" size="lg" onClick={saveBrand} disabled={pending || !pickedMarka}>
                  Запомни марката
                </AdminButton>
              </div>
            )}

            {showModelPicker && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-col gap-2 @lg:flex-row @lg:items-end">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-semibold text-muted">
                      Моделът „{preview.source.modelName ?? "—"}“ в mobile.bg е:
                    </p>
                    <Combobox
                      aria-label={`Моделът „${preview.source.modelName ?? "—"}“ в mobile.bg`}
                      options={[
                        { value: "", label: "— изберете —" },
                        ...mapping.modelOptions.map((m) => ({ value: m, label: m })),
                      ]}
                      value={pickedModel}
                      onValueChange={setPickedModel}
                    />
                  </div>
                  <AdminButton variant="primary" size="lg" onClick={applyModel} disabled={pending || !pickedModel}>
                    Използвай
                  </AdminButton>
                </div>
                {preview.source.modelExternalId !== null && (
                  <label className="flex min-h-10 cursor-pointer items-start gap-3 py-1 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={rememberModel}
                      onChange={(e) => setRememberModel(e.target.checked)}
                      className="mt-0.5 size-5 shrink-0 accent-brand"
                    />
                    <span>
                      Запомни за всички коли с модел „{preview.source.modelName ?? "—"}“. Махнете отметката, ако зависи
                      от версията — напр. BMW „3er“ е „320“ или „330“ според двигателя.
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {blockers.length > 0 && (
            <AdminBanner tone="error">
              <p className="mb-1 font-bold">Публикуването е спряно:</p>
              <ul className="list-disc space-y-1 pl-5 font-normal">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </AdminBanner>
          )}

          {/* Not a fault with the car: required choices the admin still has to make. */}
          {missing.length > 0 && (
            <AdminBanner tone="warning">
              <p className="mb-1 font-bold">Попълнете, за да публикувате:</p>
              <ul className="list-disc space-y-1 pl-5 font-normal">
                {missing.map((m) => (
                  <li key={m.field}>{m.message}</li>
                ))}
              </ul>
            </AdminBanner>
          )}

          {invalid.length > 0 && (
            <AdminBanner tone="error">
              <p className="mb-1 font-bold">Стойности, които mobile.bg не разпознава:</p>
              <ul className="list-disc space-y-1 pl-5 font-normal">
                {invalid.map((v) => (
                  <li key={`${v.field}:${v.value}`}>
                    <code>{v.field}</code> = „{v.value}“
                  </li>
                ))}
              </ul>
            </AdminBanner>
          )}

          {/* Price — always shown with its derivation, never as a bare number. */}
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold text-ink">Цена в обявата</p>
            <p className="text-sm text-muted">
              Себестойност до България: {mapped?.landedEur ? `${mapped.landedEur.toLocaleString("bg-BG")} €` : "—"}
              {" · надценка "}
              {preview.markupPct}%{" → "}
              {mapped?.computedPriceEur ? `${mapped.computedPriceEur.toLocaleString("bg-BG")} €` : "—"}
            </p>
            <p className="mt-1 text-sm text-ink">
              В обявата:{" "}
              <strong>
                {mapped?.sentPriceEur != null
                  ? `${mapped.sentPriceEur.toLocaleString("bg-BG")} €`
                  : "цена при запитване"}
              </strong>
              {mapped?.sentPriceEur != null &&
                mapped.computedPriceEur != null &&
                mapped.sentPriceEur !== mapped.computedPriceEur && (
                  <span className="text-muted"> (ръчна цена вместо изчислената)</span>
                )}
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
            <AdminBanner tone="warning">
              <p className="mb-1 font-bold">За проверка:</p>
              <ul className="list-disc space-y-1 pl-5 font-normal">
                {mapped.warnings.map((w) => (
                  <li key={`${w.field}:${w.message}`}>
                    <code>{w.field}</code> — {w.message}
                  </li>
                ))}
              </ul>
            </AdminBanner>
          )}

          {/* Fields our data cannot supply. */}
          <div className="grid gap-4 @lg:grid-cols-2">
            <PickField label="Месец на производство" required={missingFields.has("month")}>
              <Combobox
                aria-label="Месец на производство"
                options={[{ value: "", label: "Изберете" }, ...MONTHS.map((m) => ({ value: m, label: m }))]}
                value={month}
                onValueChange={(v) => {
                  setMonth(v);
                  reloadWith({ month: v || undefined });
                }}
              />
            </PickField>
            <PickField label="Валидност (дни) — за дилъри е само статистика">
              <Combobox
                aria-label="Валидност (дни)"
                options={[
                  { value: "35", label: "35 дни" },
                  { value: "49", label: "49 дни" },
                ]}
                value={term}
                onValueChange={setTerm}
              />
            </PickField>
            <PickField label="Категория" required={missingFields.has("category")}>
              <Combobox
                aria-label="Категория"
                options={categoryChoices}
                value={effectiveCategory}
                onValueChange={(v) => {
                  setCategory(v);
                  reloadWith({ category: v || undefined });
                }}
              />
            </PickField>
            <PickField label="Държава (извън страната)" required={missingFields.has("locatc")}>
              <Combobox
                aria-label="Държава (извън страната)"
                options={countryChoices}
                value={effectiveCountry}
                onValueChange={(v) => {
                  setLocatc(v);
                  reloadWith({ locatc: v || undefined });
                }}
              />
            </PickField>
            <PickField label="ДДС статус на цената" required={missingFields.has("price_dds")}>
              <Combobox
                aria-label="ДДС статус на цената"
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
            </PickField>
            {needsBattery && (
              <>
                <div>
                  <TextField
                    label="Пробег с едно зареждане (WLTP), км"
                    inputMode="numeric"
                    value={batteryKm}
                    onChange={setBatteryKm}
                    onCommit={() => {
                      if (batteryKmInput.kind !== "invalid") reloadWith({});
                    }}
                    placeholder="напр. 533"
                  />
                  {batteryKmInput.kind === "invalid" ? (
                    <p className="mt-1 text-xs font-semibold text-[#b3261e]">{batteryKmInput.message}</p>
                  ) : (
                    missingFields.has("battery_km") && (
                      <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително за тази кола</p>
                    )
                  )}
                </div>
                <div>
                  <TextField
                    label="Капацитет на батерията, kWh"
                    inputMode="decimal"
                    value={batteryKwh}
                    onChange={setBatteryKwh}
                    onCommit={() => {
                      if (batteryKwhInput.kind !== "invalid") reloadWith({});
                    }}
                    placeholder="напр. 75 или 75,5"
                  />
                  {batteryKwhInput.kind === "invalid" ? (
                    <p className="mt-1 text-xs font-semibold text-[#b3261e]">{batteryKwhInput.message}</p>
                  ) : (
                    missingFields.has("battery_kwh") && (
                      <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително за тази кола</p>
                    )
                  )}
                </div>
              </>
            )}
            <div>
              <TextField
                label="Цена (EUR) — ръчно"
                inputMode="decimal"
                value={priceOverride}
                onChange={setPriceOverride}
                onCommit={() => {
                  if (manualPrice.kind !== "invalid") reloadWith({});
                }}
                placeholder="празно = изчислената"
              />
              {manualPrice.kind === "invalid" && (
                <p className="mt-1 text-xs font-semibold text-[#b3261e]">{manualPrice.message}</p>
              )}
              {manualPrice.kind === "ok" && (
                <p className="mt-1 text-xs text-muted">
                  Ще се публикува като {manualPrice.eur.toLocaleString("bg-BG")} €.
                </p>
              )}
            </div>
            <TextField
              label="Допълнителни екстри (разделени с /)"
              value={extraExtri}
              onChange={setExtraExtri}
              placeholder="Кожен салон/Парктроник/7 места"
            />
            <div className="flex items-end">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={priceOnRequest}
                  onChange={(e) => {
                    setPriceOnRequest(e.target.checked);
                    reloadWith({ priceOnRequest: e.target.checked || undefined });
                  }}
                  className="size-5 shrink-0 accent-brand"
                />
                Цена при запитване
              </label>
            </div>
          </div>

          <div>
            <label htmlFor={`${uid}-extinfo`} className={`mb-1 block ${ADMIN_LABEL}`}>
              Описание (extinfo)
            </label>
            <textarea
              id={`${uid}-extinfo`}
              value={extinfo}
              onChange={(e) => setExtinfo(e.target.value)}
              rows={4}
              placeholder={mapped?.params.extinfo ?? ""}
              className={`${ADMIN_INPUT} min-h-28`}
            />
            <p className={`mt-1 ${ADMIN_HINT}`}>Празно = генерираното описание (показано като плейсхолдър).</p>
          </div>

          {/* The exact wire format — the whole point of a preview. A list, not a
              wide table: it reads on a phone. */}
          {mapped && Object.keys(mapped.params).length > 0 && (
            <details className="group rounded-xl border border-line">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                Параметри към advertpub ({Object.keys(mapped.params).length})
                <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <dl className="m-0 divide-y divide-line/60 border-t border-line px-3 text-sm">
                {Object.entries(mapped.params).map(([k, v]) => (
                  <div key={k} className="grid gap-x-3 py-2 @lg:grid-cols-[10rem_minmax(0,1fr)]">
                    <dt className="min-w-0">
                      <span className="font-mono text-xs text-ink">{k}</span>
                      <span className="block text-xs text-muted">{preview.catfields[k]?.ftext ?? "—"}</span>
                    </dt>
                    <dd className="min-w-0 wrap-anywhere whitespace-pre-wrap text-ink">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}

          {/* Sticky: the outcome of „Публикувай" shows where the tap was. */}
          <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-card backdrop-blur-sm">
            {feedback}
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton variant="secondary" onClick={refresh} disabled={pending}>
                Преизчисли
              </AdminButton>
              <AdminButton variant="primary" onClick={openConfirm} disabled={pending || !canPublish}>
                {preview.advert?.ida ? "Коригирай обявата" : "Публикувай в mobile.bg"}
              </AdminButton>
              {preview.unchanged && <span className="text-sm text-muted">Няма промени спрямо публикуваното.</span>}
            </div>
          </div>
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
          <>
            {preview?.advert?.ida ? (
              <>
                Обявата ще бъде обновена в mobile.bg (ID {preview.advert.ida}). Корекциите са безплатни (Общи условия,
                т. I.15).
              </>
            ) : (
              <>
                Ще бъде създадена НОВА обява в mobile.bg. Докато е активна, mobile.bg начислява седмична такса по
                дилърската тарифа (т. I.16) — обявата не изтича сама, а стои до изтриване.
              </>
            )}{" "}
            Цената в обявата ще бъде{" "}
            <strong>
              {mapped?.sentPriceEur != null ? `${mapped.sentPriceEur.toLocaleString("bg-BG")} €` : "„при запитване“"}
            </strong>
            .
          </>
        }
      />
    </div>
  );
}

/** A Combobox under a visible caption (the Combobox carries the same text as its accessible name). */
function PickField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={`mb-1 ${ADMIN_LABEL}`}>{label}</p>
      {children}
      {required && <p className="mt-1 text-xs font-semibold text-[#b3261e]">Задължително</p>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Leaving the field or pressing Enter: the moment to recompute. */
  onCommit?: () => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`mb-1 block ${ADMIN_LABEL}`}>
        {label}
      </label>
      <input
        id={id}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit?.();
        }}
        placeholder={placeholder}
        className={ADMIN_INPUT}
      />
    </div>
  );
}
