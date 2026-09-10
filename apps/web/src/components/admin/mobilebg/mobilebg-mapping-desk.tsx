"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMobilebgBrandMapping, deleteMobilebgModelMapping } from "@/mutations/mobilebg";
import type { MobilebgBrandMapRow, MobilebgModelMapRow } from "@/queries/mobilebg";

/**
 * The remembered overrides — every brand/model pairing an admin confirmed from
 * the advert preview.
 *
 * There is no "add" form here on purpose: pairings are created in the preview,
 * where the car, our model name and mobile.bg's list for that brand are all on
 * screen at once. The old desk asked for our internal reference ids, which an
 * admin has no way of knowing.
 */
export function MobilebgMappingDesk({
  brands,
  models,
}: {
  brands: MobilebgBrandMapRow[];
  models: MobilebgModelMapRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function removeBrand(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await deleteMobilebgBrandMapping(id);
      if (!res.success) setError(res.error);
      router.refresh();
    });
  }

  function removeModel(modelExternalId: number, manufacturerExternalId: number) {
    setError(null);
    startTransition(async () => {
      const res = await deleteMobilebgModelMapping(modelExternalId, manufacturerExternalId);
      if (!res.success) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">{error}</p>}

      <MappingTable
        title={`Марки (${brands.length})`}
        headers={["Наша марка", "mobile.bg", ""]}
        rows={brands.map((b) => ({
          key: `b-${b.manufacturerExternalId}`,
          cells: [b.ourName ?? `#${b.manufacturerExternalId}`, b.marka],
          onRemove: () => removeBrand(b.manufacturerExternalId),
        }))}
        pending={pending}
      />

      <MappingTable
        title={`Модели (${models.length})`}
        headers={["Наш модел", "mobile.bg", ""]}
        rows={models.map((m) => ({
          key: `m-${m.modelExternalId}`,
          cells: [m.ourName ?? `#${m.modelExternalId}`, `${m.marka} ${m.model}`],
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
        <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
          Няма ръчни съответствия — всичко се разпознава автоматично.
        </p>
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
