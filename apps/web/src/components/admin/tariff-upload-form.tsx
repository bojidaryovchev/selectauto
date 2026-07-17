"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadTariffs } from "@/mutations/tariffs";

/**
 * Admin tariff paste form: the CargoLoop inland + container tables, pasted from
 * Excel/Google Sheets (which copies as tab-separated text). No file upload, no
 * xlsx parser — plain text, so it's immune to which program made the sheet. The
 * `uploadTariffs` action parses/validates, stores a new active version, and
 * revalidates the calculator's tariff cache. Validation errors surface verbatim.
 */
type Status = { kind: "idle" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

const TA =
  "w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs text-ink outline-none focus:border-brand";

export function TariffUploadForm() {
  const router = useRouter();
  const [inlandTsv, setInlandTsv] = useState("");
  const [containerTsv, setContainerTsv] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await uploadTariffs({ inlandTsv, containerTsv, note });
      if (result.success) {
        setStatus({
          kind: "ok",
          message: `Готово — активирана нова версия: ${result.data.inlandRows} транспортни реда, ${result.data.containerRows} контейнерни цени.`,
        });
        setInlandTsv("");
        setContainerTsv("");
        setNote("");
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Възникна грешка при запис. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <p className="text-sm text-muted">
        Отворете таблицата в Excel/Google Sheets, маркирайте данните <strong>заедно със заглавния ред</strong> и ги
        поставете тук (Ctrl+V). Данните се копират автоматично като таблица — без файлове.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-ink">Транспортна таблица (inland, +$235)</label>
        <textarea
          value={inlandTsv}
          onChange={(e) => setInlandTsv(e.target.value)}
          rows={6}
          placeholder="Auction Location⇥Auction⇥City⇥State⇥Zip⇥Savannah, GA⇥Elizabeth, NJ⇥…"
          className={TA}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-ink">Контейнерна таблица (+$105)</label>
        <textarea
          value={containerTsv}
          onChange={(e) => setContainerTsv(e.target.value)}
          rows={5}
          placeholder="Price Per 1 Unit⇥…⇥Savannah, GA⇥Elizabeth, NJ⇥…&#10;4 cars in 40'HC⇥…"
          className={TA}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-ink">Бележка (по избор)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="напр. Тарифи от 01.08.2026"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
      </div>

      {status.kind === "error" ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">{status.message}</p>
      ) : null}
      {status.kind === "ok" ? (
        <p className="rounded-lg bg-[#e8f5ec] px-3 py-2 text-sm font-semibold text-[#1d6b35]">{status.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Обработка…" : "Запази и активирай"}
      </button>
    </form>
  );
}
