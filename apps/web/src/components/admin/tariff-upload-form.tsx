"use client";

import { ADMIN_HINT, ADMIN_INPUT, ADMIN_LABEL, AdminBanner, AdminButton, AdminCard } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ChevronDownIcon } from "@/components/icons";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import type { TariffChange, TariffDiffGroup } from "@/lib/tariff-diff";
import { checkTariffsAction, type TariffCheck, uploadTariffs } from "@/mutations/tariffs";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Admin tariff paste form: the CargoLoop inland + container tables, pasted from
 * Excel/Google Sheets (which copies as tab-separated text). No file upload, no
 * xlsx parser — plain text, so it's immune to which program made the sheet.
 *
 * Two steps: „Провери" parses the paste and shows what it would change against
 * the active table (checkTariffsAction — nothing is saved); „Запази и активирай"
 * then stores it as the new active version (uploadTariffs), asking first when
 * locations would lose their price. A paste used to go live at once, so a
 * partial selection quietly left hundreds of yards without a transport price.
 * Editing either table after the check drops it — what goes live is always
 * what was checked.
 */
type Status = { kind: "idle" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

// Monospace for the pasted columns; 16 px on phones and iOS, so focusing it doesn't zoom.
const TSV =
  "block min-h-32 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 font-mono text-base text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 sm:text-xs supports-[-webkit-touch-callout:none]:text-base";

const LOST = "Връзката прекъсна — нищо не е записано. Опитайте отново.";

export function TariffUploadForm() {
  const router = useRouter();
  const inlandId = useId();
  const containerId = useId();
  const noteId = useId();
  const [inlandTsv, setInlandTsv] = useState("");
  const [containerTsv, setContainerTsv] = useState("");
  const [note, setNote] = useState("");
  const [check, setCheck] = useState<TariffCheck | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState<"check" | "save" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function edit(set: (v: string) => void, value: string) {
    set(value);
    setCheck(null);
    setStatus({ kind: "idle" });
  }

  async function runCheck(e: React.FormEvent) {
    e.preventDefault();
    setBusy("check");
    setStatus({ kind: "idle" });
    try {
      const result = await checkTariffsAction({ inlandTsv, containerTsv });
      if (result.success) setCheck(result.data);
      else setStatus({ kind: "error", message: result.error });
    } catch {
      setStatus({ kind: "error", message: LOST });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setConfirmOpen(false);
    setBusy("save");
    setStatus({ kind: "idle" });
    try {
      const result = await uploadTariffs({ inlandTsv, containerTsv, note });
      if (result.success) {
        setStatus({
          kind: "ok",
          message: `Готово — активирана е новата версия: ${result.data.inlandRows} транспортни реда, ${result.data.containerRows} контейнерни цени.`,
        });
        setInlandTsv("");
        setContainerTsv("");
        setNote("");
        setCheck(null);
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: LOST });
    } finally {
      setBusy(null);
    }
  }

  const removed = check?.diff.removed.count ?? 0;

  return (
    <AdminCard className="flex flex-col gap-4">
      <form onSubmit={runCheck} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Отворете таблицата в Excel/Google Sheets, маркирайте данните <strong>заедно със заглавния ред</strong> и ги
          поставете тук (Ctrl+V). Данните се копират автоматично като таблица — без файлове.
        </p>

        <div className="flex flex-col gap-1">
          <label htmlFor={inlandId} className={ADMIN_LABEL}>
            Транспортна таблица (inland, +$235)
          </label>
          <textarea
            id={inlandId}
            value={inlandTsv}
            onChange={(e) => edit(setInlandTsv, e.target.value)}
            rows={6}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Auction Location⇥Auction⇥City⇥State⇥Zip⇥Savannah, GA⇥Elizabeth, NJ⇥…"
            className={TSV}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={containerId} className={ADMIN_LABEL}>
            Контейнерна таблица (+$105)
          </label>
          <textarea
            id={containerId}
            value={containerTsv}
            onChange={(e) => edit(setContainerTsv, e.target.value)}
            rows={5}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={"Price Per 1 Unit⇥…⇥Savannah, GA⇥Elizabeth, NJ⇥…\n4 cars in 40'HC⇥…"}
            className={TSV}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className={ADMIN_LABEL}>
            Бележка <span className="font-normal text-muted">(по избор)</span>
          </label>
          <input
            id={noteId}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="напр. Тарифи от 01.08.2026"
            className={`${ADMIN_INPUT} sm:max-w-md`}
          />
        </div>

        {status.kind === "error" ? <AdminBanner tone="error">{status.message}</AdminBanner> : null}
        {status.kind === "ok" ? <AdminBanner tone="success">{status.message}</AdminBanner> : null}

        {!check ? (
          <AdminButton type="submit" variant="primary" size="lg" className="self-start" disabled={busy !== null}>
            {busy === "check" ? "Проверка…" : "Провери таблиците"}
          </AdminButton>
        ) : null}
      </form>

      {check ? (
        <CheckSummary check={check}>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="primary"
              size="lg"
              disabled={busy !== null}
              onClick={() => (removed > 0 ? setConfirmOpen(true) : void save())}
            >
              {busy === "save" ? "Запазване…" : "Запази и активирай"}
            </AdminButton>
            <AdminButton variant="secondary" size="lg" disabled={busy !== null} onClick={() => setCheck(null)}>
              Откажи
            </AdminButton>
          </div>
        </CheckSummary>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Да активирам ли таблицата?"
        message={`${removed} ${removed === 1 ? "локация остава" : "локации остават"} без транспортна цена — за коли от тях калкулаторът няма да дава обща сума.`}
        confirmLabel="Активирай"
        tone="danger"
        isPending={busy === "save"}
        onConfirm={() => void save()}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminCard>
  );
}

/** What the checked paste would change, then the actions passed in. */
function CheckSummary({ check, children }: { check: TariffCheck; children: React.ReactNode }) {
  const { diff, baseline } = check;
  const nothing =
    diff.added.count === 0 && diff.removed.count === 0 && diff.changed.count === 0 && diff.container.count === 0;
  return (
    <section
      aria-label="Проверка на таблиците"
      className="flex flex-col gap-3 rounded-xl border border-line bg-neutral-50 p-4"
    >
      <h3 className="text-base font-black text-ink">Проверка</h3>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">Сега</dt>
        <dd className="font-semibold text-ink">
          {baseline.createdAt ? `версията от ${formatSofiaDateTime(baseline.createdAt)}` : "вградената таблица"} —{" "}
          {baseline.inlandRows} реда, {baseline.containerRows} контейнерни цени
        </dd>
        <dt className="text-muted">След активиране</dt>
        <dd className="font-semibold text-ink">
          {check.inlandRows} реда, {check.containerRows} контейнерни цени
        </dd>
      </dl>

      {diff.removed.count > 0 ? (
        <AdminBanner tone="warning">
          {diff.removed.count === 1
            ? "1 локация няма да има транспортна цена"
            : `${diff.removed.count} локации няма да имат транспортна цена`}{" "}
          — за коли от тях калкулаторът и mobile.bg няма да дадат обща сума.
        </AdminBanner>
      ) : null}
      {nothing ? (
        <AdminBanner tone="info">Таблиците съвпадат с активната — цените няма да се променят.</AdminBanner>
      ) : null}

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm">
        <Stat label="Нови локации" n={diff.added.count} />
        <Stat label="Без цена след активиране" n={diff.removed.count} warn />
        <Stat label="С променена цена" n={diff.changed.count} />
        <Stat label="Без промяна" n={diff.unchanged} />
        <Stat label="Контейнерни цени с промяна" n={diff.container.count} />
      </ul>

      <Details title="Без цена след активиране" group={diff.removed} />
      <Details title="Нови локации" group={diff.added} />
      <Details title="С променена цена" group={diff.changed} />
      <Details title="Контейнерни цени" group={diff.container} />

      {children}
    </section>
  );
}

function Stat({ label, n, warn }: { label: string; n: number; warn?: boolean }) {
  return (
    <li
      className={`rounded-full border px-3 py-1 ${
        warn && n > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-line bg-white text-ink"
      }`}
    >
      {label}: <strong>{n}</strong>
    </li>
  );
}

function Details({ title, group }: { title: string; group: TariffDiffGroup<string | TariffChange> }) {
  if (group.count === 0) return null;
  const more = group.count - group.sample.length;
  return (
    <details className="group rounded-lg border border-line bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
        {title} ({group.count})
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="m-0 flex list-none flex-col gap-1 border-t border-line px-3 py-2 text-sm wrap-anywhere text-ink">
        {group.sample.map((item, i) =>
          typeof item === "string" ? (
            <li key={i}>{item}</li>
          ) : (
            <li key={i}>
              {item.label}: <span className="text-muted">{item.from}</span> → <strong>{item.to}</strong>
            </li>
          ),
        )}
        {more > 0 ? <li className={ADMIN_HINT}>…и още {more}</li> : null}
      </ul>
    </details>
  );
}
