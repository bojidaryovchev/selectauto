"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/common";
import { applyDeindex, lookupForDeindex, revokeDeindex } from "@/mutations/deindex";
import type { LookupResult } from "@/queries/deindex";

/**
 * Search → review → charge → suppress.
 *
 * The REVIEW step is not decoration. A VIN routinely owns several car rows, each
 * with its own indexable URL, so the admin must see the full list before taking
 * money — otherwise they promise "your car is gone" while a sibling URL stays
 * live, which is exactly what the customer will find by googling their own VIN.
 *
 * The confirm dialog states plainly what the site can and cannot deliver: the
 * pages die immediately, Bing/IndexNow are notified automatically, and Google has
 * no removal API at all so it stays a manual Search Console step.
 */
export function DeindexManager() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  // Request metadata — the paper trail for a sold service.
  const [requesterName, setRequesterName] = useState("");
  const [requesterContact, setRequesterContact] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  function search() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await lookupForDeindex(q);
      if (!res.success) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res.data);
      if (res.data.candidates.length === 0) {
        setError("Няма намерен автомобил по този VIN / номер на лот / линк.");
      }
    });
  }

  function confirmApply() {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const res = await applyDeindex({
        vin: result?.vin ?? "",
        requesterName,
        requesterContact,
        proofNote,
        feeAmount,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      const indexNowNote =
        res.data.indexNow === "submitted"
          ? "IndexNow: изпратено."
          : res.data.indexNow === "failed"
            ? "IndexNow: неуспешно (сайтът все пак е обновен)."
            : "IndexNow: пропуснато (няма ключ).";
      setNotice(
        `Скрити ${res.data.carIds.length} обяви за VIN ${res.data.vin}. ${indexNowNote} ` +
          `Google няма API за премахване — подайте ръчно заявка в Search Console.`,
      );
      const res2 = await lookupForDeindex(result?.vin ?? "");
      if (res2.success) setResult(res2.data);
      router.refresh();
    });
  }

  function revoke() {
    if (!result?.vin) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeDeindex(result.vin!);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotice(
        `Възстановени ${res.data.carIds.length} обяви. Забележка: блокът в Bing НЕ се вдига автоматично, ` +
          `а Google обхожда по свой график.`,
      );
      const res2 = await lookupForDeindex(result.vin!);
      if (res2.success) setResult(res2.data);
      router.refresh();
    });
  }

  const candidates = result?.candidates ?? [];
  const anySuppressed = candidates.some((c) => c.deindexedAt !== null);
  const allSuppressed = candidates.length > 0 && candidates.every((c) => c.deindexedAt !== null);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <label htmlFor="deindex-q" className="mb-1 block text-sm font-semibold text-ink">
          VIN, номер на лот или линк към обявата
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="deindex-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="напр. 1D7HU182X8J137865 или https://www.selectauto.bg/avtomobil/50290"
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

      {error && (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b3261e]">{error}</p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
      )}

      {candidates.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-1 font-bold text-ink">
            VIN {result?.vin} — {candidates.length}{" "}
            {candidates.length === 1 ? "обява" : "обяви"}
          </h2>
          <p className="mb-3 text-sm text-muted">
            Един автомобил може да има няколко обяви (пре-листване, Copart→IAAI). Всички по-долу
            ще бъдат скрити заедно.
          </p>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-152 text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-bold">URL</th>
                  <th className="px-3 py-2 font-bold">Автомобил</th>
                  <th className="px-3 py-2 font-bold">Лот</th>
                  <th className="px-3 py-2 font-bold">В каталога</th>
                  <th className="px-3 py-2 font-bold">Състояние</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.carId} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2 font-semibold text-ink">{c.url}</td>
                    <td className="px-3 py-2 text-muted">
                      {c.year ? `${c.year} ` : ""}
                      {c.title ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {c.lotNumber ?? "—"}
                      {c.domainName ? ` · ${c.domainName}` : ""}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {c.listedActive ? "активна" : c.listedArchived ? "приключила" : "не"}
                    </td>
                    <td className="px-3 py-2">
                      {c.deindexedAt ? (
                        <span className="font-bold text-rose-700">скрита</span>
                      ) : (
                        <span className="text-muted">видима</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!allSuppressed && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Заявител" value={requesterName} onChange={setRequesterName} />
              <Field label="Контакт" value={requesterContact} onChange={setRequesterContact} />
              <Field
                label="Доказателство за собственост"
                value={proofNote}
                onChange={setProofNote}
                placeholder="напр. талон №… / договор"
              />
              <Field label="Такса (EUR)" value={feeAmount} onChange={setFeeAmount} placeholder="напр. 50" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!allSuppressed && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={pending}
                className="h-10 rounded-full bg-[#b3261e] px-5 text-sm font-bold text-white disabled:opacity-40"
              >
                Скрий от сайта и търсачките
              </button>
            )}
            {anySuppressed && (
              <button
                type="button"
                onClick={revoke}
                disabled={pending}
                className="h-10 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink disabled:opacity-40"
              >
                Възстанови
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirming}
        tone="danger"
        title="Скриване на обявите"
        confirmLabel="Скрий"
        isPending={pending}
        onConfirm={confirmApply}
        onCancel={() => setConfirming(false)}
        message={
          <span className="block space-y-2 text-left">
            <span className="block">
              {candidates.length} {candidates.length === 1 ? "обява" : "обяви"} за VIN{" "}
              <b>{result?.vin}</b> ще върнат <b>410 Gone</b> и ще изчезнат от каталога, картата на
              сайта и филтрите.
            </span>
            <span className="block text-sm text-muted">
              Bing и IndexNow се уведомяват автоматично. <b>Google няма API за премахване</b> —
              подайте ръчна заявка в Search Console. Снимките се хостват от аукциона и остават
              достъпни там.
            </span>
          </span>
        }
      />
    </div>
  );
}

function Field({
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
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand"
      />
    </label>
  );
}
