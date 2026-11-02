"use client";

import { ADMIN_HINT, AdminBanner, AdminButton } from "@/components/admin/ui";
import { advertUrl } from "@/lib/mobilebg/advert-url";
import { reconcileMobilebgAdverts, type ReconcileResult } from "@/mutations/mobilebg";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * „Сверка с mobile.bg" — finds the adverts deleted on mobile.bg's side (in their
 * dealer panel), which the register still holds as live, and after a look at
 * the count marks them deleted here. Reading the list is free and changes
 * nothing at mobile.bg. See `reconcileMobilebgAdverts`.
 */

function adverts(n: number): string {
  return n === 1 ? "1 обява" : `${n} обяви`;
}

export function MobilebgReconcile() {
  const router = useRouter();
  const [report, setReport] = useState<ReconcileResult | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(apply: boolean) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        const res = await reconcileMobilebgAdverts(apply);
        if (!res.success) {
          setError(res.error);
          return;
        }
        if (!apply) {
          setReport(res.data);
          return;
        }
        setReport(null);
        setDone(`Отбелязани като изтрити: ${adverts(res.data.marked)}.`);
        router.refresh();
      } catch {
        setError("Връзката със сървъра прекъсна. Опитайте отново.");
      }
    });
  }

  const missing = report?.missing ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <AdminButton variant="secondary" onClick={() => run(false)} disabled={pending}>
          {pending && !report ? "Проверка…" : "Сверка с mobile.bg"}
        </AdminButton>
        <p className={ADMIN_HINT}>За обяви, изтрити направо в mobile.bg, които тук още се водят активни.</p>
      </div>

      {error && <AdminBanner tone="error">{error}</AdminBanner>}
      {done && <AdminBanner tone="success">{done}</AdminBanner>}

      {report && missing.length === 0 && (
        <AdminBanner tone="success">
          Регистърът съвпада с mobile.bg: всички {adverts(report.checked)}, водени тук като активни, са там.
        </AdminBanner>
      )}

      {report && missing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            <strong>{adverts(missing.length)}</strong> от {report.checked}, водени тук като активни, вече ги няма в
            mobile.bg — изтрити са там. Ще бъдат отбелязани като изтрити и тук; в mobile.bg нищо не се променя.
          </p>
          <details>
            <summary className="flex min-h-10 cursor-pointer items-center font-semibold">Списък</summary>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-xs">
              {missing.map((m) => (
                <li key={m.carId}>
                  #{m.carId} · ID {m.ida}
                </li>
              ))}
            </ul>
          </details>
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="primary" onClick={() => run(true)} disabled={pending}>
              {pending ? "Записване…" : `Отбележи ${adverts(missing.length)} като изтрити`}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setReport(null)} disabled={pending}>
              Отказ
            </AdminButton>
          </div>
        </div>
      )}

      {report && report.untrackedCount > 0 && (
        <AdminBanner tone="info" className="font-normal">
          В акаунта в mobile.bg има още {adverts(report.untrackedCount)}, които не са публикувани оттук (например
          ръчно в mobile.bg). Те също се таксуват:{" "}
          {report.untracked.map((ida, i) => (
            <span key={ida}>
              {i > 0 ? ", " : ""}
              <a href={advertUrl(ida)} target="_blank" rel="noreferrer" className="-my-2 inline-block py-2 underline">
                {ida}
              </a>
            </span>
          ))}
          {report.untrackedCount > report.untracked.length ? " …" : ""}
        </AdminBanner>
      )}
    </div>
  );
}
