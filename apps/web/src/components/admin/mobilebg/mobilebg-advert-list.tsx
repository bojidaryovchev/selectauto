"use client";

import { AdminBanner, AdminButton, AdminEmptyState } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common";
import { advertUrl } from "@/lib/mobilebg/advert-url";
import { carTitle } from "@/lib/mobilebg/car-title";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { deleteMobilebgAdvert } from "@/mutations/mobilebg";
import type { MobilebgAdvertRow } from "@/queries/mobilebg";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * The register of everything we have sent to mobile.bg.
 *
 * `failed` and `deleted` rows are shown alongside live ones deliberately: a
 * failed publish carries the error an admin needs, and a deleted row is the
 * record that we did once pay for that advert.
 *
 * Cards while the list is narrower than 56rem, a table above (container query
 * on the list's own wrapper, like the contracts register).
 */

const STATUS_LABEL: Record<string, string> = {
  pending: "изпраща се",
  published: "публикувана",
  failed: "неуспешна",
  deleted: "изтрита",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "text-amber-700",
  published: "font-bold text-emerald-700",
  failed: "font-bold text-rose-700",
  deleted: "text-muted",
};

function price(r: MobilebgAdvertRow): string {
  return r.priceEur ? `${Math.round(Number(r.priceEur)).toLocaleString("bg-BG")} €` : "при запитване";
}

function Ida({ ida }: { ida: string | null }) {
  if (!ida) return <span className="text-muted">няма</span>;
  return (
    <a
      href={advertUrl(ida)}
      target="_blank"
      rel="noreferrer"
      className="-my-2 inline-block py-2 font-mono text-xs text-brand hover:underline"
    >
      {ida}
    </a>
  );
}

export function MobilebgAdvertList({ rows }: { rows: MobilebgAdvertRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<MobilebgAdvertRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    const carId = target?.carId;
    setTarget(null);
    if (carId === undefined) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMobilebgAdvert(carId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <AdminEmptyState title="Няма изпратени обяви." />;
  }

  const canDelete = (r: MobilebgAdvertRow) => Boolean(r.ida) && r.status !== "deleted";
  const deleteButton = (r: MobilebgAdvertRow) => (
    <AdminButton variant="secondary" onClick={() => setTarget(r)} disabled={pending}>
      Изтрий
    </AdminButton>
  );

  return (
    <div className="flex flex-col gap-3">
      {error && <AdminBanner tone="error">{error}</AdminBanner>}

      <div className="@container">
        <ul className="m-0 grid list-none gap-2 p-0 @xl:grid-cols-2 @4xl:hidden">
          {rows.map((r) => (
            <li
              key={r.carId}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-white p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/avtomobil/${r.carId}`}
                  className="-my-1 min-w-0 py-1 font-semibold wrap-anywhere text-ink hover:text-brand"
                >
                  {carTitle(r.year, r.title, r.carId)}
                </Link>
                <span className={`shrink-0 ${STATUS_CLASS[r.status] ?? "text-muted"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <p className="text-xs break-all text-muted">
                #{r.carId}
                {r.vin ? ` · ${r.vin}` : ""}
              </p>
              {r.lastError && <p className="text-xs wrap-anywhere text-rose-700">{r.lastError}</p>}
              <p className="text-muted">
                mobile.bg: <Ida ida={r.ida} /> · {price(r)} · {r.pictureCount} снимки
              </p>
              <p className="text-xs text-muted">Обновена: {formatSofiaDateTime(r.updatedAt)}</p>
              {canDelete(r) && <div>{deleteButton(r)}</div>}
            </li>
          ))}
        </ul>

        <div className="hidden overflow-hidden rounded-xl border border-line bg-white @4xl:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="px-3 py-2 font-bold">
                  Автомобил
                </th>
                <th scope="col" className="px-3 py-2 font-bold">
                  mobile.bg ID
                </th>
                <th scope="col" className="px-3 py-2 font-bold">
                  Статус
                </th>
                <th scope="col" className="px-3 py-2 font-bold">
                  Цена
                </th>
                <th scope="col" className="px-3 py-2 font-bold">
                  Снимки
                </th>
                <th scope="col" className="px-3 py-2 font-bold">
                  Обновена
                </th>
                <th scope="col" className="px-3 py-2 font-bold">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.carId} className="border-b border-line/60 align-top last:border-0">
                  <td className="min-w-56 px-3 py-2">
                    <Link
                      href={`/avtomobil/${r.carId}`}
                      className="font-semibold wrap-anywhere text-ink hover:text-brand"
                    >
                      {carTitle(r.year, r.title, r.carId)}
                    </Link>
                    <div className="text-xs break-all text-muted">
                      #{r.carId}
                      {r.vin ? ` · ${r.vin}` : ""}
                    </div>
                    {r.lastError && <div className="mt-1 text-xs wrap-anywhere text-rose-700">{r.lastError}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <Ida ida={r.ida} />
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap ${STATUS_CLASS[r.status] ?? "text-muted"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{price(r)}</td>
                  <td className="px-3 py-2 text-muted">{r.pictureCount}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{formatSofiaDateTime(r.updatedAt)}</td>
                  <td className="px-3 py-2">{canDelete(r) && deleteButton(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={target !== null}
        tone="danger"
        title="Изтриване на обявата"
        confirmLabel="Изтрий"
        isPending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
        message={
          <>
            Обявата ще бъде премахната от mobile.bg (ID {target?.ida}). Изтриването е безплатно и спира седмичната
            такса; вече платени VIP/ТОП услуги не се възстановяват (Общи условия, т. I.15, I.16, II.8).
          </>
        }
      />
    </div>
  );
}
