"use client";

import { ADMIN_INPUT, AdminBanner } from "@/components/admin/ui";
import { Button, Combobox, ConfirmDialog, MakePlate } from "@/components/common";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
} from "@/components/icons";
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
 * Търсете → преглед → публикувайте (boards `ab-mobilebg`, `-ready`, `-gone`, `-block`, `-dict`, `-ev`, `-model`,
 * `-start`, `-states`, `-flow`; parity check docs/design/parity/admin-mobilebg.md).
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
 * everywhere („запомнете"), or just for this advert when the right answer depends
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
 *
 * One primary per view: the search is the primary until a car is open, then the dock's „Публикувайте в mobile.bg"
 * is, and the pickers' „Запомнете марката" / „Използвайте" are secondary.
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

/** The kit's checkbox, with the focus ring on its box. */
const CHECKBOX =
  "sa-chk has-focus-visible:[&_.sa-box]:outline-2 has-focus-visible:[&_.sa-box]:outline-offset-2 has-focus-visible:[&_.sa-box]:outline-ortx";

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
  // A field's change recomputes the preview in a transition of its own, so the buttons stay live meanwhile. Leaving a
  // text field for a button used to start the recompute on the press and disable the button before the click, which
  // was then lost. „Публикувайте" recomputes and re-checks everything before its dialog, so nothing goes out stale.
  // The search waits for it, though: actions run one at a time, so a recompute still in flight lands after a new
  // search has cleared the preview and puts the previous car back (found in the production review, 18.11.2026).
  const [recomputing, startRecompute] = useTransition();

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
  function run(
    task: () => Promise<void>,
    lost = "Връзката със сървъра прекъсна. Опитайте отново.",
    start = startTransition,
  ) {
    start(async () => {
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
  function load(carId: number, over: MobilebgOverrides = overrides(), start = startTransition) {
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
    }, undefined, start);
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
    if (!q || recomputing) return;
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
    if (preview) load(preview.source.carId, { ...overrides(), ...patch }, startRecompute);
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
    const carId = preview.source.carId;
    setError(null);
    run(async () => {
      const res = await publishCarToMobilebg({ carId, overrides: overrides() });
      if (!res.success) {
        setError(res.error);
        // A failure can change the stored advert — an id mobile.bg no longer
        // has is cleared — and the button and the dialog must say „new advert"
        // from then on. Re-read without `load`, which would clear the error;
        // a re-read that fails must not replace it either.
        try {
          const fresh = await previewAdvertAction(carId, overrides());
          if (fresh.success) setPreview(fresh.data);
        } catch {
          // The error above stays; „Преизчислете" re-reads.
        }
        router.refresh();
        return;
      }
      const skipped =
        res.data.skippedPictures.length > 0 ? ` Пропуснати снимки: ${res.data.skippedPictures.length}.` : "";
      setNotice({
        text: `${res.data.edited ? "Обявата е коригирана" : "Обявата е публикувана"}: ID ${res.data.ida}, ${res.data.pictureCount === 1 ? "1 снимка" : `${res.data.pictureCount} снимки`}.${skipped}`,
        url: advertUrl(res.data.ida),
      });
      load(carId);
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

  // What an action said: under the search before a car is open, in the
  // action bar once one is — on a phone, the top of the page is a long way
  // from the publish button that caused it.
  const feedback =
    error || notice ? (
      <div className="ab-stack gap-2">
        {error ? (
          <AdminBanner tone="error" className="ab-al">
            {error}
          </AdminBanner>
        ) : null}
        {notice ? (
          <AdminBanner tone="success" className="ab-al">
            {notice.text}{" "}
            {notice.url ? (
              <a href={notice.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Вижте обявата в mobile.bg
              </a>
            ) : null}
          </AdminBanner>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="ab-stack">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="sa-pnl ab-srch"
      >
        <label htmlFor="mobilebg-q" className="sa-lbl">
          ID на автомобил, VIN, номер на лот или линк към обявата
        </label>
        <div className="ab-srch__r">
          <span className="sa-inw">
            <SearchIcon />
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
          </span>
          <Button
            type="submit"
            variant={preview ? "sec" : "pri"}
            size="md"
            disabled={pending || recomputing || !query.trim()}
            busy={pending}
          >
            {pending ? "Търсете…" : "Търсете"}
          </Button>
        </div>
      </form>

      {!preview ? feedback : null}

      {hits.length > 1 && !preview ? (
        <section className="sa-pnl ab-stack gap-2">
          <h2 className="ab-h3">Изберете автомобил</h2>
          <ul className="ab-hits">
            {hits.map((h) => (
              <li key={h.carId}>
                <button type="button" onClick={() => openCar(h.carId)}>
                  <b>{carTitle(h.year, h.title, h.carId)}</b>
                  <small>
                    #{h.carId}
                    {h.lotNumber ? ` · лот ${h.lotNumber}` : ""}
                    {h.domainName ? ` · ${h.domainName}` : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview && mapping ? (
        <section className="sa-pnl ab-pub">
          <header className="ab-pub__h">
            <h2>
              {preview.make ? <MakePlate name={preview.make.name} logo={preview.make.logo} size="sm" /> : null}
              <span>{carTitle(preview.source.year, preview.source.title, preview.source.carId)}</span>
            </h2>
            <p>
              #{preview.source.carId}
              {preview.source.vin ? ` · VIN ${preview.source.vin}` : ""}
              {preview.source.lotNumber ? ` · лот ${preview.source.lotNumber}` : ""}
              {" · "}
              {preview.source.images.length === 1 ? "1 снимка" : `${preview.source.images.length} снимки`}
            </p>
            {preview.advert?.ida ? (
              <a href={advertUrl(preview.advert.ida)} target="_blank" rel="noreferrer" className="ab-ida">
                <ExternalLinkIcon />
                Обявата в mobile.bg (ID {preview.advert.ida})
              </a>
            ) : null}
          </header>

          {!preview.credentialsConfigured ? (
            <AdminBanner tone="warning" className="ab-al">
              Акаунтът за импорт в mobile.bg още не е конфигуриран. Обявата се изчислява напълно, но не може да бъде
              изпратена.
            </AdminBanner>
          ) : null}

          {/* A relist (or the same car at another auction) that is already advertised. */}
          {preview.sameVinAdverts.length > 0 && !preview.advert?.ida ? (
            <AdminBanner tone="warning" className="ab-al">
              Същият автомобил (VIN {preview.source.vin}) вече има обява в mobile.bg:{" "}
              {preview.sameVinAdverts.map((s, i) => (
                <span key={s.carId}>
                  {i > 0 ? ", " : ""}
                  <a
                    href={advertUrl(s.ida)}
                    target="_blank"
                    rel="noreferrer"
                    className="-my-2 inline-block py-2 underline underline-offset-2"
                  >
                    ID {s.ida}
                  </a>{" "}
                  (кола №{s.carId})
                </span>
              ))}
              . Публикуването тук ще създаде втора, отделно платена обява за една кола — по-добре коригирайте или
              изтрийте съществуващата.
            </AdminBanner>
          ) : null}

          {/* Brand / model — resolved automatically, with the evidence shown. */}
          <div className="ab-mbox">
            <b>Марка и модел в mobile.bg</b>
            {mapping.unavailable ? (
              <p className="ab-unav">
                Речникът на mobile.bg не отговаря — съответствието не може да бъде проверено. Опитайте „Преизчислете“
                след малко.
              </p>
            ) : (
              <ul>
                <li>
                  Марка: <strong>{mapping.marka ?? "—"}</strong>
                  {mapping.marka ? <span> — {markaProvenance(preview)}</span> : null}
                </li>
                <li>
                  Модел: <strong>{mapping.model ?? "—"}</strong>
                  {mapping.model ? <span> — {modelProvenance(preview)}</span> : null}
                  {mapping.model && !changingModel ? (
                    <button type="button" onClick={() => setChangingModel(true)} className="ab-chg">
                      променете
                    </button>
                  ) : null}
                </li>
              </ul>
            )}

            {!mapping.marka && mapping.markaOptions.length > 0 ? (
              <div className="ab-pick">
                <div className="ab-pick__r">
                  <div className="ab-fld">
                    <p className="sa-lbl">Марката „{preview.source.brandName ?? "—"}“ в mobile.bg е:</p>
                    <Combobox
                      className="ad-in"
                      aria-label={`Марката „${preview.source.brandName ?? "—"}“ в mobile.bg`}
                      options={[
                        { value: "", label: "— изберете —" },
                        ...mapping.markaOptions.map((m) => ({ value: m, label: m })),
                      ]}
                      value={pickedMarka}
                      onValueChange={setPickedMarka}
                    />
                  </div>
                  <Button variant="sec" size="md" onClick={saveBrand} disabled={pending || !pickedMarka}>
                    Запомнете марката
                  </Button>
                </div>
              </div>
            ) : null}

            {showModelPicker ? (
              <div className="ab-pick">
                <div className="ab-pick__r">
                  <div className="ab-fld">
                    <p className="sa-lbl">Моделът „{preview.source.modelName ?? "—"}“ в mobile.bg е:</p>
                    <Combobox
                      className="ad-in"
                      aria-label={`Моделът „${preview.source.modelName ?? "—"}“ в mobile.bg`}
                      options={[
                        { value: "", label: "— изберете —" },
                        ...mapping.modelOptions.map((m) => ({ value: m, label: m })),
                      ]}
                      value={pickedModel}
                      onValueChange={setPickedModel}
                    />
                  </div>
                  <Button variant="sec" size="md" onClick={applyModel} disabled={pending || !pickedModel}>
                    Използвайте
                  </Button>
                </div>
                {preview.source.modelExternalId !== null ? (
                  <label className={`${CHECKBOX} ${rememberModel ? "is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={rememberModel}
                      onChange={(e) => setRememberModel(e.target.checked)}
                    />
                    <span className="sa-box">
                      <CheckIcon />
                    </span>
                    <span>
                      Запомнете за всички коли с модел „{preview.source.modelName ?? "—"}“. Махнете отметката, ако
                      зависи от версията — напр. BMW „3er“ е „320“ или „330“ според двигателя.
                    </span>
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>

          {blockers.length > 0 ? (
            <AdminBanner tone="error" className="ab-al">
              <b>Публикуването е спряно:</b>
              <ul>
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </AdminBanner>
          ) : null}

          {/* Not a fault with the car: required choices the admin still has to make. */}
          {missing.length > 0 ? (
            <AdminBanner tone="warning" className="ab-al">
              <b>Попълнете, за да публикувате:</b>
              <ul>
                {missing.map((m) => (
                  <li key={m.field}>{m.message}</li>
                ))}
              </ul>
            </AdminBanner>
          ) : null}

          {invalid.length > 0 ? (
            <AdminBanner tone="error" className="ab-al">
              <b>Стойности, които mobile.bg не разпознава:</b>
              <ul>
                {invalid.map((v) => (
                  <li key={`${v.field}:${v.value}`}>
                    <code>{v.field}</code> = „{v.value}“
                  </li>
                ))}
              </ul>
            </AdminBanner>
          ) : null}

          {/* Price — always shown with its derivation, never as a bare number. */}
          <div className="ab-price">
            <b>Цена в обявата</b>
            <p>
              Себестойност до България: {mapped?.landedEur ? `${mapped.landedEur.toLocaleString("bg-BG")} €` : "—"}
              {" · надценка "}
              {preview.markupPct}%{" → "}
              {mapped?.computedPriceEur ? `${mapped.computedPriceEur.toLocaleString("bg-BG")} €` : "—"}
            </p>
            <p className="ab-pl">
              В обявата:{" "}
              <strong>
                {mapped?.sentPriceEur != null ? `${mapped.sentPriceEur.toLocaleString("bg-BG")} €` : "цена при запитване"}
              </strong>
              {mapped?.sentPriceEur != null &&
              mapped.computedPriceEur != null &&
              mapped.sentPriceEur !== mapped.computedPriceEur ? (
                <span> (ръчна цена вместо изчислената)</span>
              ) : null}
            </p>
            <small>
              Аукционната цена на лота е{" "}
              {preview.source.priceUsd
                ? `${Math.round(preview.source.priceUsd).toLocaleString("bg-BG")} $`
                : "— (лотът още няма наддаване или „Купи сега“)"}{" "}
              и <b>НЕ</b> се публикува — тя не включва транспорт, мито, ДДС и такси.
            </small>
          </div>

          {mapped && mapped.warnings.length > 0 ? (
            <AdminBanner tone="warning" className="ab-al">
              <b>За проверка:</b>
              <ul>
                {mapped.warnings.map((w) => (
                  <li key={`${w.field}:${w.message}`}>
                    <code>{w.field}</code> — {w.message}
                  </li>
                ))}
              </ul>
            </AdminBanner>
          ) : null}

          {/* Fields our data cannot supply. */}
          <div className="ab-pg">
            <PickField label="Месец на производство" required={missingFields.has("month")}>
              <Combobox
                className="ad-in"
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
                className="ad-in"
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
                className="ad-in"
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
                className="ad-in"
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
                className="ad-in"
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
            {needsBattery ? (
              <>
                <TextField
                  label="Пробег с едно зареждане (WLTP), км"
                  inputMode="numeric"
                  value={batteryKm}
                  onChange={setBatteryKm}
                  onCommit={() => {
                    if (batteryKmInput.kind !== "invalid") reloadWith({});
                  }}
                  placeholder="напр. 533"
                  message={
                    batteryKmInput.kind === "invalid"
                      ? { kind: "error", text: batteryKmInput.message }
                      : missingFields.has("battery_km")
                        ? { kind: "required", text: "Задължително за тази кола" }
                        : undefined
                  }
                />
                <TextField
                  label="Капацитет на батерията, kWh"
                  inputMode="decimal"
                  value={batteryKwh}
                  onChange={setBatteryKwh}
                  onCommit={() => {
                    if (batteryKwhInput.kind !== "invalid") reloadWith({});
                  }}
                  placeholder="напр. 75 или 75,5"
                  message={
                    batteryKwhInput.kind === "invalid"
                      ? { kind: "error", text: batteryKwhInput.message }
                      : missingFields.has("battery_kwh")
                        ? { kind: "required", text: "Задължително за тази кола" }
                        : undefined
                  }
                />
              </>
            ) : null}
            <TextField
              label="Цена (EUR) — ръчно"
              inputMode="decimal"
              value={priceOverride}
              onChange={setPriceOverride}
              onCommit={() => {
                if (manualPrice.kind !== "invalid") reloadWith({});
              }}
              placeholder="празно = изчислената"
              message={
                manualPrice.kind === "invalid"
                  ? { kind: "error", text: manualPrice.message }
                  : manualPrice.kind === "ok"
                    ? { kind: "ok", text: `Ще се публикува като ${manualPrice.eur.toLocaleString("bg-BG")} €.` }
                    : undefined
              }
            />
            <TextField
              label="Допълнителни екстри (разделени с /)"
              value={extraExtri}
              onChange={setExtraExtri}
              placeholder="Кожен салон/Парктроник/7 места"
            />
            <div className="ab-chk">
              <label className={`${CHECKBOX} ${priceOnRequest ? "is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={priceOnRequest}
                  onChange={(e) => {
                    setPriceOnRequest(e.target.checked);
                    reloadWith({ priceOnRequest: e.target.checked || undefined });
                  }}
                />
                <span className="sa-box">
                  <CheckIcon />
                </span>
                <span>Цена при запитване</span>
              </label>
            </div>
          </div>

          <div className="ab-fld">
            <label htmlFor={`${uid}-extinfo`} className="sa-lbl">
              Описание (extinfo)
            </label>
            <textarea
              id={`${uid}-extinfo`}
              value={extinfo}
              onChange={(e) => setExtinfo(e.target.value)}
              rows={4}
              placeholder={mapped?.params.extinfo ?? ""}
              aria-describedby={`${uid}-extinfo-h`}
              className="sa-in ab-ta w-full"
            />
            <p id={`${uid}-extinfo-h`} className="ab-hint">
              Празно = генерираното описание (показано като плейсхолдър).
            </p>
          </div>

          {/* The exact wire format — the whole point of a preview. A list, not a
              wide table: it reads on a phone. */}
          {mapped && Object.keys(mapped.params).length > 0 ? (
            <details className="ab-params">
              <summary>
                Параметри към advertpub ({Object.keys(mapped.params).length})
                <ChevronDownIcon />
              </summary>
              <dl>
                {Object.entries(mapped.params).map(([k, v]) => (
                  <div key={k}>
                    <dt>
                      <code>{k}</code>
                      <small>{preview.catfields[k]?.ftext ?? "—"}</small>
                    </dt>
                    <dd>{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}

          {/* Sticky: the outcome of „Публикувайте" shows where the tap was. */}
          <div className="ab-dock ab-dock--stick bottom-[calc(10px+env(safe-area-inset-bottom))]">
            {feedback}
            <div className="ab-row">
              <Button variant="sec" size="md" onClick={refresh} disabled={pending}>
                <RefreshCwIcon />
                Преизчислете
              </Button>
              <Button variant="pri" size="md" onClick={openConfirm} disabled={pending || !canPublish}>
                <SendIcon />
                {preview.advert?.ida ? "Коригирайте обявата" : "Публикувайте в mobile.bg"}
              </Button>
              {preview.unchanged ? (
                <span className="ab-hint text-sm">Няма промени спрямо публикуваното.</span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={confirming}
        tone="danger"
        title={preview?.advert?.ida ? "Корекция на обява" : "Публикуване на обява"}
        confirmLabel={preview?.advert?.ida ? "Коригирайте" : "Публикувайте"}
        isPending={pending}
        onConfirm={confirmPublish}
        onCancel={() => setConfirming(false)}
        message={
          <span className="ab-dlg-note text-tx">
            {preview?.advert?.ida ? (
              <>
                Обявата ще бъде обновена в mobile.bg (ID {preview.advert.ida}). Корекциите са безплатни (Общи условия,
                т. I.15).
              </>
            ) : (
              <>
                Ще бъде създадена <b>НОВА</b> обява в mobile.bg. Докато е активна, mobile.bg начислява седмична такса
                по дилърската тарифа (т. I.16) — обявата не изтича сама, а стои до изтриване.
                {preview && preview.sameVinAdverts.length > 0 ? (
                  <strong> Същият автомобил вече има обява там — това ще е втора, платена отделно.</strong>
                ) : null}
              </>
            )}{" "}
            Цената в обявата ще бъде{" "}
            <strong>
              {mapped?.sentPriceEur != null ? `${mapped.sentPriceEur.toLocaleString("bg-BG")} €` : "„при запитване“"}
            </strong>
            .
          </span>
        }
      />
    </div>
  );
}

/** A list under a visible caption (the list carries the same text as its accessible name). */
function PickField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="ab-fld">
      <p className="sa-lbl">{label}</p>
      {children}
      {required ? (
        <p className="ab-req">
          <AlertIcon />
          Задължително
        </p>
      ) : null}
    </div>
  );
}

/**
 * A text field with what to say under it: an error (the field outlined, `aria-invalid`), a field still required, or
 * how a typed value will be read (`ok`).
 */
function TextField({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  inputMode,
  message,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Leaving the field or pressing Enter: the moment to recompute. */
  onCommit?: () => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  message?: { kind: "error" | "required" | "ok"; text: string };
}) {
  const id = useId();
  const messageId = `${id}-m`;
  const isError = message?.kind === "error";
  return (
    <div className="ab-fld">
      <label htmlFor={id} className="sa-lbl">
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
        aria-invalid={isError || undefined}
        aria-describedby={message ? messageId : undefined}
        className={`${ADMIN_INPUT} ${isError ? "is-err" : ""}`}
      />
      {message?.kind === "ok" ? (
        <p id={messageId} className="ab-ok">
          {message.text}
        </p>
      ) : message ? (
        <p id={messageId} className="ab-req">
          <AlertIcon />
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
