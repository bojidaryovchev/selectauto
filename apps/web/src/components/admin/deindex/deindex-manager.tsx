"use client";

import { ADMIN_INPUT, AdminBanner } from "@/components/admin/ui";
import { Button, ConfirmDialog, MakePlate } from "@/components/common";
import { ExternalLinkIcon, EyeOffIcon, RotateCcwIcon, SearchIcon } from "@/components/icons";
import { applyDeindex, lookupForDeindex, revokeDeindex } from "@/mutations/deindex";
import type { DeindexCandidate, DeindexFoundCar, LookupResult } from "@/queries/deindex";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

/**
 * Search → review → charge → suppress (boards `ab-hidden`, `-done`, `-states`, `-states2`, `-flow`; parity check
 * docs/design/parity/admin-hidden.md).
 *
 * The REVIEW step is not decoration. A VIN routinely owns several car rows, each
 * with its own indexable URL, so the admin must see the full list before taking
 * money — otherwise they promise "your car is gone" while a sibling URL stays
 * live, which is exactly what the customer will find by googling their own VIN.
 *
 * The confirm dialog states plainly what the site can and cannot deliver: the
 * pages die immediately, search engines that take IndexNow (Bing, Yandex…) are
 * notified automatically, and Google has no removal API at all so it stays a
 * manual Search Console step.
 *
 * Each search starts a fresh request: the requester's details are cleared, so
 * one customer's name, proof or fee can't ride along onto the next VIN.
 */
type Feedback = { tone: "error" | "success"; text: string } | null;

export function DeindexManager() {
  const router = useRouter();
  const queryId = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  // Next to the search box: why a search found nothing usable.
  const [searchError, setSearchError] = useState<string | null>(null);
  // Next to the hide/restore buttons: what they did.
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirming, setConfirming] = useState<"apply" | "revoke" | null>(null);
  const [pending, startTransition] = useTransition();

  // Request metadata — the paper trail for a sold service.
  const [requesterName, setRequesterName] = useState("");
  const [requesterContact, setRequesterContact] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  function clearRequest() {
    setRequesterName("");
    setRequesterContact("");
    setProofNote("");
    setFeeAmount("");
  }

  /** Runs a server call; a dropped connection is reported here instead of replacing the page. */
  function run(task: () => Promise<void>, onLost: () => void) {
    startTransition(async () => {
      try {
        await task();
      } catch {
        onLost();
      }
    });
  }

  function search(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setSearchError(null);
    setFeedback(null);
    clearRequest();
    run(
      async () => {
        const res = await lookupForDeindex(q);
        if (!res.success) {
          setResult(null);
          setSearchError(res.error);
          return;
        }
        setResult(res.data);
        if (res.data.candidates.length === 0 && res.data.choices.length === 0 && res.data.withoutVin.length === 0) {
          setSearchError("Няма намерен автомобил по този VIN / номер на лот / линк.");
        }
      },
      () => setSearchError("Връзката прекъсна — търсенето не завърши. Опитайте отново."),
    );
  }

  /** After hiding or restoring, the list shows the new state. */
  async function refreshResult(vin: string) {
    const res = await lookupForDeindex(vin);
    if (res.success) setResult(res.data);
    router.refresh();
  }

  function confirmApply() {
    const vin = result?.vin ?? "";
    setConfirming(null);
    setFeedback(null);
    run(
      async () => {
        const res = await applyDeindex({ vin, requesterName, requesterContact, proofNote, feeAmount });
        if (!res.success) {
          setFeedback({ tone: "error", text: res.error });
          return;
        }
        const indexNowNote =
          res.data.indexNow === "submitted"
            ? "IndexNow: изпратено."
            : res.data.indexNow === "failed"
              ? "IndexNow: неуспешно (сайтът все пак е обновен)."
              : "IndexNow: пропуснато (няма ключ).";
        const { found, withdrawn, failed } = res.data.adverts;
        const advertsNote =
          found === 0
            ? ""
            : failed === 0
              ? ` mobile.bg: изтеглени ${withdrawn} ${withdrawn === 1 ? "обява" : "обяви"}.`
              : ` mobile.bg: ${failed === 1 ? "1 обява не можа да бъде изтеглена" : `${failed} обяви не можаха да бъдат изтеглени`} — изтрийте от „mobile.bg“, иначе остават платени.`;
        setFeedback({
          tone: failed > 0 ? "error" : "success",
          text:
            `${res.data.carIds.length === 1 ? "Скрита 1 обява" : `Скрити ${res.data.carIds.length} обяви`} за VIN ${res.data.vin}. ${indexNowNote}${advertsNote} ` +
            `Google няма API за премахване — подайте ръчно заявка в Search Console.`,
        });
        clearRequest();
        await refreshResult(vin);
      },
      () =>
        setFeedback({
          tone: "error",
          text: "Връзката прекъсна — не е ясно дали обявите са скрити. Потърсете VIN-а отново, преди да опитате пак.",
        }),
    );
  }

  function confirmRevoke() {
    const vin = result?.vin;
    setConfirming(null);
    if (!vin) return;
    setFeedback(null);
    run(
      async () => {
        const res = await revokeDeindex(vin);
        if (!res.success) {
          setFeedback({ tone: "error", text: res.error });
          return;
        }
        setFeedback({
          tone: "success",
          text:
            res.data.carIds.length === 1
              ? "Възстановена 1 обява. Търсачките ще я обходят отново по свой график."
              : `Възстановени ${res.data.carIds.length} обяви. Търсачките ще ги обходят отново по свой график.`,
        });
        await refreshResult(vin);
      },
      () =>
        setFeedback({
          tone: "error",
          text: "Връзката прекъсна — не е ясно дали обявите са възстановени. Потърсете VIN-а отново.",
        }),
    );
  }

  const candidates = result?.candidates ?? [];
  const anySuppressed = candidates.some((c) => c.deindexedAt !== null);
  const allSuppressed = candidates.length > 0 && candidates.every((c) => c.deindexedAt !== null);
  const count = `${candidates.length} ${candidates.length === 1 ? "обява" : "обяви"}`;

  return (
    <>
      <section className="sa-pnl">
        <form
          role="search"
          className="ab-srch"
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
        >
          <label htmlFor={queryId} className="sa-lbl">
            VIN, номер на лот или линк към обявата
          </label>
          <div className="ab-srch__r">
            <span className="sa-inw">
              <SearchIcon />
              <input
                id={queryId}
                type="search"
                enterKeyHint="search"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="напр. 1D7HU182X8J137865 или https://www.selectauto.bg/avtomobil/50290"
                className={ADMIN_INPUT}
              />
            </span>
            <Button type="submit" variant="pri" size="md" disabled={pending || !query.trim()} busy={pending}>
              {pending ? "Търсете…" : "Търсете"}
            </Button>
          </div>
          {searchError ? (
            <AdminBanner tone="error" className="ab-al">
              {searchError}
            </AdminBanner>
          ) : null}
          {result?.withoutVin.map((car) => (
            <AdminBanner key={car.carId} tone="warning" className="ab-al">
              {carName(car)} (обява №{car.carId}) няма VIN. Скриването е по VIN, за да хване всички обяви на колата,
              затова не може да се приложи.
            </AdminBanner>
          ))}
        </form>
      </section>

      {result && result.choices.length > 0 ? (
        <section className="sa-pnl flex flex-col gap-3">
          <h2 className="ab-h2">Номерът съвпада с няколко автомобила — изберете кой</h2>
          <ul className="ab-choice">
            {result.choices.map((car) => (
              <li key={car.carId}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setQuery(car.vin ?? "");
                    search(car.vin ?? "");
                  }}
                >
                  <b>{carName(car)}</b>
                  <small>
                    VIN {car.vin} · {car.via === "id" ? `обява №${car.carId}` : "номер на лот"}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {candidates.length > 0 ? (
        <section className="sa-pnl ab-cand">
          <header>
            <h2>
              VIN <span className="ab-mono">{result?.vin}</span> — {count}
            </h2>
            <p>
              Един автомобил може да има няколко обяви (пре-листване, Copart→IAAI). Всички по-долу ще бъдат скрити
              заедно.
            </p>
          </header>

          <CandidateCards candidates={candidates} />
          <CandidateTable candidates={candidates} />

          {!allSuppressed ? (
            <div className="ab-reqf">
              <Field label="Заявител" value={requesterName} onChange={setRequesterName} autoComplete="off" />
              <Field label="Контакт" value={requesterContact} onChange={setRequesterContact} autoComplete="off" />
              <Field
                label="Доказателство за собственост"
                value={proofNote}
                onChange={setProofNote}
                placeholder="напр. талон №… / договор"
              />
              <Field
                label="Такса (EUR)"
                value={feeAmount}
                onChange={setFeeAmount}
                placeholder="напр. 50"
                inputMode="decimal"
              />
            </div>
          ) : null}

          <div className="ab-row">
            {!allSuppressed ? (
              <Button variant="neg" size="md" disabled={pending} onClick={() => setConfirming("apply")}>
                <EyeOffIcon />
                Скрийте от сайта и търсачките
              </Button>
            ) : null}
            {anySuppressed ? (
              <Button variant="sec" size="md" disabled={pending} onClick={() => setConfirming("revoke")}>
                <RotateCcwIcon />
                Възстановете
              </Button>
            ) : null}
          </div>
          {feedback ? (
            <AdminBanner tone={feedback.tone} className="ab-al">
              {feedback.text}
            </AdminBanner>
          ) : null}
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={confirming === "apply"}
        tone="danger"
        title="Скриване на обявите"
        confirmLabel="Скрийте"
        isPending={pending}
        onConfirm={confirmApply}
        onCancel={() => setConfirming(null)}
        message={
          <span className="ab-dlg-note block space-y-2 text-left">
            <span className="block">
              {count} за VIN <b>{result?.vin}</b> ще върнат <b>410 Gone</b> и ще изчезнат от каталога, картата на сайта
              и филтрите.
            </span>
            <span className="block text-sm text-tx2">
              Търсачките, които приемат IndexNow (Bing, Yandex и др.), се уведомяват автоматично.{" "}
              <b>Google няма API за премахване</b> — подайте ръчна заявка в Search Console. Снимките се хостват от
              аукциона и остават достъпни там.
            </span>
          </span>
        }
      />
      <ConfirmDialog
        isOpen={confirming === "revoke"}
        title="Възстановяване на обявите"
        confirmLabel="Възстановете"
        isPending={pending}
        onConfirm={confirmRevoke}
        onCancel={() => setConfirming(null)}
        message={
          <span className="ab-dlg-note block space-y-2 text-left">
            <span className="block">
              {count} за VIN <b>{result?.vin}</b> отново ще се виждат в сайта, каталога и картата на сайта.
            </span>
            <span className="block text-sm text-tx2">
              Заявката остава в регистъра като отменена. Търсачките ще ги обходят отново по свой график.
            </span>
          </span>
        }
      />
    </>
  );
}

/**
 * The listing's own title („2014 Chevrolet Cruze Lt" — it carries the year), as
 * the public page shows it. `year` is not prefixed: titles already start with
 * one, and on some rows the two disagree. Without a title: year and id.
 */
function carName(car: Pick<DeindexFoundCar, "carId" | "title" | "year">): string {
  return car.title?.trim() || [car.year, `Автомобил №${car.carId}`].filter(Boolean).join(" ");
}

function listedLabel(c: DeindexCandidate): string {
  return c.listedActive ? "активна" : c.listedArchived ? "приключила" : "не";
}

function StateBadge({ hidden }: { hidden: boolean }) {
  // Plain tags, no dot, as the boards draw them.
  return hidden ? (
    <span className="sa-tag ab-st shrink-0 sa-tag--neg">скрита</span>
  ) : (
    <span className="sa-tag ab-st shrink-0">видима</span>
  );
}

/** Opens the public page in a new tab — for checking the listing before charging. */
function CarLink({ c }: { c: DeindexCandidate }) {
  return (
    <a href={c.url} target="_blank" rel="noreferrer" className="ab-url">
      <ExternalLinkIcon />
      {c.url}
    </a>
  );
}

/** The car with its make's plate (decision 8). */
function CarName({ c }: { c: DeindexCandidate }) {
  return (
    <span className="ab-car">
      {c.make ? <MakePlate name={c.make.name} logo={c.make.logo} size="xs" /> : null}
      <span>{carName(c)}</span>
    </span>
  );
}

/** Below a 768 px panel: one card per listing. */
function CandidateCards({ candidates }: { candidates: DeindexCandidate[] }) {
  return (
    <ul className="ab-ccards">
      {candidates.map((c) => (
        <li key={c.carId}>
          <div>
            <CarLink c={c} />
            <StateBadge hidden={c.deindexedAt !== null} />
          </div>
          <CarName c={c} />
          <span className="ab-meta">
            Лот {c.lotNumber ?? "—"}
            {c.domainName ? ` · ${c.domainName}` : ""} · в каталога: {listedLabel(c)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CandidateTable({ candidates }: { candidates: DeindexCandidate[] }) {
  return (
    <div className="ab-ctbl sa-tbl-wrap">
      <table className="sa-tbl">
        <thead>
          <tr>
            <th>URL</th>
            <th>Автомобил</th>
            <th>Лот</th>
            <th>В каталога</th>
            <th>Състояние</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.carId}>
              <td>
                <CarLink c={c} />
              </td>
              <td>
                <CarName c={c} />
              </td>
              <td className="mute">
                {c.lotNumber ?? "—"}
                {c.domainName ? ` · ${c.domainName}` : ""}
              </td>
              <td className="mute">{listedLabel(c)}</td>
              <td>
                <StateBadge hidden={c.deindexedAt !== null} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="ab-fld">
      <label htmlFor={id} className="sa-lbl">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={ADMIN_INPUT}
      />
    </div>
  );
}
