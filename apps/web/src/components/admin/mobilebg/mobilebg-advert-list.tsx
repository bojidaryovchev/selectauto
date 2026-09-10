"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/common";
import { deleteMobilebgAdvert } from "@/mutations/mobilebg";
import type { MobilebgAdvertRow } from "@/queries/mobilebg";
import { carTitle } from "@/lib/mobilebg/car-title";

/**
 * The register of everything we have sent to mobile.bg.
 *
 * `failed` and `deleted` rows are shown alongside live ones deliberately: a
 * failed publish carries the error an admin needs, and a deleted row is the
 * record that we did once pay for that advert.
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
    return <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">Няма изпратени обяви.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-152 text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-bold">Автомобил</th>
              <th className="px-3 py-2 font-bold">mobile.bg ID</th>
              <th className="px-3 py-2 font-bold">Статус</th>
              <th className="px-3 py-2 font-bold">Цена</th>
              <th className="px-3 py-2 font-bold">Снимки</th>
              <th className="px-3 py-2 font-bold">Обновена</th>
              <th className="px-3 py-2 font-bold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.carId} className="border-b border-line/60 last:border-0 align-top">
                <td className="px-3 py-2">
                  <Link href={`/avtomobil/${r.carId}`} className="font-semibold text-ink hover:text-brand">
                    {carTitle(r.year, r.title, r.carId)}
                  </Link>
                  <div className="text-xs text-muted">
                    #{r.carId}
                    {r.vin ? ` · ${r.vin}` : ""}
                  </div>
                  {r.lastError && <div className="mt-1 text-xs text-rose-700">{r.lastError}</div>}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{r.ida ?? "—"}</td>
                <td className={`px-3 py-2 ${STATUS_CLASS[r.status] ?? "text-muted"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </td>
                <td className="px-3 py-2 text-muted">
                  {r.priceEur ? `${Math.round(Number(r.priceEur)).toLocaleString("bg-BG")} €` : "при запитване"}
                </td>
                <td className="px-3 py-2 text-muted">{r.pictureCount}</td>
                <td className="px-3 py-2 text-muted">{r.updatedAt.toLocaleString("bg-BG")}</td>
                <td className="px-3 py-2">
                  {r.ida && r.status !== "deleted" && (
                    <button
                      type="button"
                      onClick={() => setTarget(r)}
                      disabled={pending}
                      className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink disabled:opacity-40"
                    >
                      Изтрий
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            Обявата ще бъде премахната от mobile.bg (ID {target?.ida}). Платената такса не се
            възстановява, а повторно публикуване ще създаде нова, отделно таксувана обява.
          </>
        }
      />
    </div>
  );
}
