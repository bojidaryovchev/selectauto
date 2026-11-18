"use client";

import { AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { ChevronDownIcon, ListChecksIcon } from "@/components/icons";
import { advertUrl } from "@/lib/mobilebg/advert-url";
import { reconcileMobilebgAdverts, type ReconcileResult } from "@/mutations/mobilebg";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * „Сверка с mobile.bg" — finds the adverts deleted on mobile.bg's side (in their
 * dealer panel), which the register still holds as live, and after a look at
 * the count marks them deleted here. Reading the list is free and changes
 * nothing at mobile.bg. See `reconcileMobilebgAdverts`. Board `ab-mobilebg-sync`;
 * parity check docs/design/parity/admin-mobilebg.md.
 *
 * Each count agrees with its noun: with one advert the texts are singular
 * („1 обява, водена тук като активна, е там."), where they used to read
 * „всички 1 обява, водени …".
 */

function adverts(n: number): string {
  return n === 1 ? "1 обява" : `${n} обяви`;
}

export function MobilebgReconcile() {
  const router = useRouter();
  const [report, setReport] = useState<ReconcileResult | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // What is running: a check of the account's list or marking the missing ones. Each shows its own busy label; a
  // check run again with a report open used to make the report's button read „Записване…".
  const [running, setRunning] = useState<"check" | "apply" | null>(null);
  const [pending, startTransition] = useTransition();

  function run(apply: boolean) {
    setError(null);
    setDone(null);
    setRunning(apply ? "apply" : "check");
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
      } finally {
        setRunning(null);
      }
    });
  }

  const missing = report?.missing ?? [];
  const checking = pending && running === "check";
  const applying = pending && running === "apply";

  return (
    <div className="ab-recon">
      <div className="ab-recon__r">
        <Button variant="sec" size="md" onClick={() => run(false)} disabled={pending} busy={checking}>
          {checking ? (
            "Проверка…"
          ) : (
            <>
              <ListChecksIcon />
              Сверка с mobile.bg
            </>
          )}
        </Button>
        <p className="ab-hint">За обяви, изтрити направо в mobile.bg, които тук още се водят активни.</p>
      </div>

      {error ? (
        <AdminBanner tone="error" className="ab-al">
          {error}
        </AdminBanner>
      ) : null}
      {done ? (
        <AdminBanner tone="success" className="ab-al">
          {done}
        </AdminBanner>
      ) : null}

      {report && missing.length === 0 ? (
        <AdminBanner tone="success" className="ab-al">
          {report.checked === 1
            ? "Регистърът съвпада с mobile.bg: 1 обява, водена тук като активна, е там."
            : `Регистърът съвпада с mobile.bg: всички ${adverts(report.checked)}, водени тук като активни, са там.`}
        </AdminBanner>
      ) : null}

      {report && missing.length > 0 ? (
        <div className="ab-recon__box">
          <p>
            <strong>{adverts(missing.length)}</strong> от {report.checked},{" "}
            {report.checked === 1 ? "водена тук като активна" : "водени тук като активни"},{" "}
            {missing.length === 1
              ? "вече я няма в mobile.bg — изтрита е там. Ще бъде отбелязана като изтрита и тук; в mobile.bg нищо не се променя."
              : "вече ги няма в mobile.bg — изтрити са там. Ще бъдат отбелязани като изтрити и тук; в mobile.bg нищо не се променя."}
          </p>
          <details>
            <summary>
              Списък
              <ChevronDownIcon />
            </summary>
            <ul>
              {missing.map((m) => (
                <li key={m.carId}>
                  #{m.carId} · ID {m.ida}
                </li>
              ))}
            </ul>
          </details>
          <div className="ab-acts">
            <Button variant="pri" size="md" onClick={() => run(true)} disabled={pending} busy={applying}>
              {applying
                ? "Записване…"
                : missing.length === 1
                  ? "Отбележете 1 обява като изтрита"
                  : `Отбележете ${missing.length} обяви като изтрити`}
            </Button>
            <Button variant="txt" size="md" onClick={() => setReport(null)} disabled={pending}>
              Отказ
            </Button>
          </div>
        </div>
      ) : null}

      {report && report.untrackedCount > 0 ? (
        <AdminBanner tone="info" className="ab-al">
          <span className="font-medium">
            {report.untrackedCount === 1
              ? "В акаунта в mobile.bg има още 1 обява, която не е публикувана оттук (например ръчно в mobile.bg). Тя също се таксува:"
              : `В акаунта в mobile.bg има още ${report.untrackedCount} обяви, които не са публикувани оттук (например ръчно в mobile.bg). Те също се таксуват:`}{" "}
            {report.untracked.map((ida, i) => (
              <span key={ida}>
                {i > 0 ? ", " : ""}
                <a href={advertUrl(ida)} target="_blank" rel="noreferrer">
                  {ida}
                </a>
              </span>
            ))}
            {report.untrackedCount > report.untracked.length ? " …" : ""}
          </span>
        </AdminBanner>
      ) : null}
    </div>
  );
}
