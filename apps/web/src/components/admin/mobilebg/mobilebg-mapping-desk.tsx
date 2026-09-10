"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Combobox } from "@/components/common";
import type { DictOption } from "@/lib/mobilebg/dictionary";
import {
  deleteMobilebgBrandMapping,
  deleteMobilebgModelMapping,
  modelOptionsAction,
  saveMobilebgBrandMapping,
  saveMobilebgModelMapping,
} from "@/mutations/mobilebg";
import type { MobilebgBrandMapRow, MobilebgModelMapRow } from "@/queries/mobilebg";

/**
 * The brand/model correspondence desk.
 *
 * Why a human confirms every pair: mobile.bg publishes into a closed vocabulary
 * whose names are CLOSE to ours but not equal — `VW` for Volkswagen, `KGM` for
 * SsangYong, `Cherry` and `Chery` as separate brands, models like `F150` and
 * `Crown victoria`. Their API accepts a wrong `model` without error and files the
 * advert where no buyer browsing that model will ever see it, after we have paid
 * for it. String matching would be right often enough to be trusted and wrong
 * exactly where it costs money, so the pairing is confirmed once and stored.
 *
 * The model list is fetched per brand because mobile.bg scopes it that way.
 */

export function MobilebgMappingDesk({
  brandOptions,
  brands,
  models,
}: {
  brandOptions: DictOption[];
  brands: MobilebgBrandMapRow[];
  models: MobilebgModelMapRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // New brand mapping.
  const [brandId, setBrandId] = useState("");
  const [marka, setMarka] = useState("");

  // New model mapping — scoped to a brand mapping that already exists.
  const [modelId, setModelId] = useState("");
  const [modelBrandKey, setModelBrandKey] = useState("");
  const [modelOptions, setModelOptions] = useState<DictOption[]>([]);
  const [model, setModel] = useState("");

  const brandChoices = [
    { value: "", label: "— изберете марка в mobile.bg —" },
    ...brandOptions.map((o) => ({ value: o.optval, label: o.optval })),
  ];

  /** Brands we have already mapped — the only ones a model may be attached to. */
  const mappedBrandChoices = [
    { value: "", label: "— изберете марка —" },
    ...brands.map((b) => ({
      value: `${b.manufacturerExternalId}:${b.marka}`,
      label: `${b.ourName ?? b.manufacturerExternalId} → ${b.marka}`,
    })),
  ];

  function pickModelBrand(key: string) {
    setModelBrandKey(key);
    setModel("");
    setModelOptions([]);
    const marka = key.split(":").slice(1).join(":");
    if (!marka) return;
    startTransition(async () => {
      const res = await modelOptionsAction(marka);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setModelOptions(res.data);
    });
  }

  function saveBrand() {
    setError(null);
    startTransition(async () => {
      const res = await saveMobilebgBrandMapping({
        manufacturerExternalId: Number(brandId),
        marka,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setBrandId("");
      setMarka("");
      router.refresh();
    });
  }

  function saveModel() {
    setError(null);
    const [brandExternalId, brandMarka] = modelBrandKey.split(":");
    startTransition(async () => {
      const res = await saveMobilebgModelMapping({
        modelExternalId: Number(modelId),
        manufacturerExternalId: Number(brandExternalId),
        marka: brandMarka,
        model,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setModelId("");
      setModel("");
      router.refresh();
    });
  }

  function removeBrand(id: number) {
    startTransition(async () => {
      const res = await deleteMobilebgBrandMapping(id);
      if (!res.success) setError(res.error);
      router.refresh();
    });
  }

  function removeModel(modelExternalId: number, manufacturerExternalId: number) {
    startTransition(async () => {
      const res = await deleteMobilebgModelMapping(modelExternalId, manufacturerExternalId);
      if (!res.success) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">{error}</p>}

      <div className="rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-1 font-bold text-ink">Нова марка</h3>
        <p className="mb-3 text-sm text-muted">
          ID-то на марката е нашето (external id от справочника) — виждате го в предупреждението
          при опит за публикуване.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Наше ID на марка</label>
            <input
              value={brandId}
              onChange={(e) => setBrandId(e.target.value.replace(/\D/g, ""))}
              placeholder="напр. 12"
              className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Марка в mobile.bg</label>
            <Combobox options={brandChoices} value={marka} onValueChange={setMarka} />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={saveBrand}
              disabled={pending || !brandId || !marka}
              className="h-11 w-full rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              Запази
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-1 font-bold text-ink">Нов модел</h3>
        <p className="mb-3 text-sm text-muted">
          Списъкът с модели в mobile.bg зависи от марката, затова първо изберете вече свързана марка.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Марка</label>
            <Combobox options={mappedBrandChoices} value={modelBrandKey} onValueChange={pickModelBrand} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Наше ID на модел</label>
            <input
              value={modelId}
              onChange={(e) => setModelId(e.target.value.replace(/\D/g, ""))}
              placeholder="напр. 344"
              className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Модел в mobile.bg</label>
            <Combobox
              options={[
                { value: "", label: modelOptions.length ? "— изберете модел —" : "— изберете марка —" },
                ...modelOptions.map((o) => ({ value: o.optval, label: o.optval })),
              ]}
              value={model}
              onValueChange={setModel}
              disabled={modelOptions.length === 0}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={saveModel}
              disabled={pending || !modelBrandKey || !modelId || !model}
              className="h-11 w-full rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              Запази
            </button>
          </div>
        </div>
      </div>

      <MappingTable
        title={`Свързани марки (${brands.length})`}
        headers={["Наша марка", "mobile.bg", ""]}
        rows={brands.map((b) => ({
          key: `b-${b.manufacturerExternalId}`,
          cells: [`${b.ourName ?? "—"} · #${b.manufacturerExternalId}`, b.marka],
          onRemove: () => removeBrand(b.manufacturerExternalId),
        }))}
        pending={pending}
      />

      <MappingTable
        title={`Свързани модели (${models.length})`}
        headers={["Наш модел", "mobile.bg", ""]}
        rows={models.map((m) => ({
          key: `m-${m.modelExternalId}`,
          cells: [`${m.ourName ?? "—"} · #${m.modelExternalId}`, `${m.marka} ${m.model}`],
          onRemove: () => removeModel(m.modelExternalId, m.manufacturerExternalId),
        }))}
        pending={pending}
      />
    </div>
  );
}

function MappingTable({
  title,
  headers,
  rows,
  pending,
}: {
  title: string;
  headers: string[];
  rows: { key: string; cells: string[]; onRemove: () => void }[];
  pending: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 font-bold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">Още няма записи.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-120 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line/60 last:border-0">
                  {r.cells.map((c) => (
                    <td key={c} className="px-3 py-2 text-ink">
                      {c}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={r.onRemove}
                      disabled={pending}
                      className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink disabled:opacity-40"
                    >
                      Премахни
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
