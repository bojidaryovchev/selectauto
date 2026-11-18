"use client";

import { ADMIN_INPUT, AdminBanner, AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/common";
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
 * Boards `ab-tariffs`, `-check`, `-states2`, `-states3`; parity check
 * docs/design/parity/admin-tariffs.md.
 *
 * Two steps: „Проверете" parses the paste and shows what it would change against
 * the active table (checkTariffsAction — nothing is saved); „Запазете и активирайте"
 * then stores it as the new active version (uploadTariffs), asking first when
 * locations would lose their price. A paste used to go live at once, so a
 * partial selection quietly left hundreds of yards without a transport price.
 * Editing either table after the check drops it — what goes live is always
 * what was checked.
 */
type Status = { kind: "idle" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

// The pasted columns in mono (`ab-tsv`); 16 px on phones and iOS, so focusing an area doesn't zoom.
const TSV = "sa-in ab-ta ab-tsv w-full text-base sm:text-[13px] supports-[-webkit-touch-callout:none]:text-base";

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
    <AdminCard className="ab-stack">
      <form onSubmit={runCheck} className="ab-upl">
        <p>
          Отворете таблицата в Excel/Google Sheets, маркирайте данните <b>заедно със заглавния ред</b> и ги
          поставете тук (Ctrl+V). Данните се копират автоматично като таблица — без файлове.
        </p>

        <div className="ab-fld">
          <label htmlFor={inlandId} className="sa-lbl">
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

        <div className="ab-fld">
          <label htmlFor={containerId} className="sa-lbl">
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

        <div className="ab-fld ab-note">
          <label htmlFor={noteId} className="sa-lbl">
            Бележка <em>(по избор)</em>
          </label>
          <input
            id={noteId}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="напр. Тарифи от 01.08.2026"
            className={ADMIN_INPUT}
          />
        </div>

        {status.kind === "error" ? (
          <AdminBanner tone="error" className="ab-al">
            {status.message}
          </AdminBanner>
        ) : null}
        {status.kind === "ok" ? (
          <AdminBanner tone="success" className="ab-al">
            {status.message}
          </AdminBanner>
        ) : null}

        {!check ? (
          <div>
            <Button type="submit" variant="pri" size="md" disabled={busy !== null} busy={busy === "check"}>
              {busy === "check" ? "Проверка…" : "Проверете таблиците"}
            </Button>
          </div>
        ) : null}
      </form>

      {check ? (
        <CheckSummary check={check}>
          <div className="ab-row">
            <Button
              variant="pri"
              size="md"
              disabled={busy !== null}
              busy={busy === "save"}
              onClick={() => (removed > 0 ? setConfirmOpen(true) : void save())}
            >
              {busy === "save" ? "Запазване…" : "Запазете и активирайте"}
            </Button>
            <Button variant="sec" size="md" disabled={busy !== null} onClick={() => setCheck(null)}>
              Откажете
            </Button>
          </div>
        </CheckSummary>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Да активирам ли таблицата?"
        message={`${removed} ${removed === 1 ? "локация остава" : "локации остават"} без транспортна цена — за коли от тях калкулаторът няма да дава обща сума.`}
        confirmLabel="Активирайте"
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
    <section aria-label="Проверка на таблиците" className="ab-check">
      <h3>Проверка</h3>
      <dl className="ab-cmp">
        <dt>Сега</dt>
        <dd>
          {baseline.createdAt ? `версията от ${formatSofiaDateTime(baseline.createdAt)}` : "вградената таблица"} —{" "}
          {baseline.inlandRows} реда, {baseline.containerRows} контейнерни цени
        </dd>
        <dt>След активиране</dt>
        <dd>
          {check.inlandRows} реда, {check.containerRows} контейнерни цени
        </dd>
      </dl>

      {diff.removed.count > 0 ? (
        <AdminBanner tone="warning" className="ab-al">
          {diff.removed.count === 1
            ? "1 локация няма да има транспортна цена"
            : `${diff.removed.count} локации няма да имат транспортна цена`}{" "}
          — за коли от тях калкулаторът и mobile.bg няма да дадат обща сума.
        </AdminBanner>
      ) : null}
      {nothing ? (
        <AdminBanner tone="info" className="ab-al">
          Таблиците съвпадат с активната — цените няма да се променят.
        </AdminBanner>
      ) : null}

      <ul className="ab-stats">
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
    <li className={warn && n > 0 ? "is-warn" : undefined}>
      {label}: <b>{n}</b>
    </li>
  );
}

function Details({ title, group }: { title: string; group: TariffDiffGroup<string | TariffChange> }) {
  if (group.count === 0) return null;
  const more = group.count - group.sample.length;
  return (
    <details className="ab-diff">
      <summary>
        {title} ({group.count})
        <ChevronDownIcon />
      </summary>
      <ul>
        {group.sample.map((item, i) =>
          typeof item === "string" ? (
            <li key={i}>{item}</li>
          ) : (
            <li key={i}>
              {item.label}: <span>{item.from}</span> → <b>{item.to}</b>
            </li>
          ),
        )}
        {more > 0 ? <li className="ab-hint">…и още {more}</li> : null}
      </ul>
    </details>
  );
}
