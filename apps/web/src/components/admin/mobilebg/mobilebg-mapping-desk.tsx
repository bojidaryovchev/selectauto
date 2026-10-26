"use client";

import { AdminBanner, AdminButton, AdminEmptyState } from "@/components/admin/ui";
import { deleteMobilebgBrandMapping, deleteMobilebgModelMapping } from "@/mutations/mobilebg";
import type { MobilebgBrandMapRow, MobilebgModelMapRow } from "@/queries/mobilebg";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
    <div className="flex flex-col gap-4">
      {error && <AdminBanner tone="error">{error}</AdminBanner>}

      <MappingList
        title={`Марки (${brands.length})`}
        rows={brands.map((b) => ({
          key: `b-${b.manufacturerExternalId}`,
          ours: b.ourName ?? `#${b.manufacturerExternalId}`,
          theirs: b.marka,
          onRemove: () => removeBrand(b.manufacturerExternalId),
        }))}
        pending={pending}
      />

      <MappingList
        title={`Модели (${models.length})`}
        rows={models.map((m) => ({
          key: `m-${m.modelExternalId}`,
          ours: m.ourName ?? `#${m.modelExternalId}`,
          theirs: `${m.marka} ${m.model}`,
          onRemove: () => removeModel(m.modelExternalId, m.manufacturerExternalId),
        }))}
        pending={pending}
      />
    </div>
  );
}

/** One pairing per row — „наше → mobile.bg" — which reads the same at any width. */
function MappingList({
  title,
  rows,
  pending,
}: {
  title: string;
  rows: { key: string; ours: string; theirs: string; onRemove: () => void }[];
  pending: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 font-bold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <AdminEmptyState title="Няма ръчни съответствия — всичко се разпознава автоматично." />
      ) : (
        <ul className="m-0 list-none divide-y divide-line/60 rounded-xl border border-line bg-white p-0">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm">
              <span className="min-w-0 wrap-anywhere text-ink">
                {r.ours} <span className="text-muted">→</span> <strong>{r.theirs}</strong>
              </span>
              <AdminButton variant="secondary" onClick={r.onRemove} disabled={pending}>
                Премахни
              </AdminButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
