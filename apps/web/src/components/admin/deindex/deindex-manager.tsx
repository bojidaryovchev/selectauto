"use client";

import { ADMIN_INPUT, ADMIN_LABEL, AdminBanner, AdminButton, AdminCard } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common";
import { applyDeindex, lookupForDeindex, revokeDeindex } from "@/mutations/deindex";
import type { DeindexCandidate, DeindexFoundCar, LookupResult } from "@/queries/deindex";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

/**
 * Search → review → charge → suppress.
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
        setFeedback({
          tone: "success",
          text:
            `Скрити ${res.data.carIds.length} обяви за VIN ${res.data.vin}. ${indexNowNote} ` +
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
          text: `Възстановени ${res.data.carIds.length} обяви. Търсачките ще ги обходят отново по свой график.`,
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
    <div className="flex flex-col gap-4">
      <AdminCard>
        <form
          role="search"
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
        >
          <label htmlFor={queryId} className={ADMIN_LABEL}>
            VIN, номер на лот или линк към обявата
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
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
            <AdminButton type="submit" variant="primary" className="shrink-0" disabled={pending || !query.trim()}>
              {pending ? "Търси…" : "Търси"}
            </AdminButton>
          </div>
          {searchError ? <AdminBanner tone="error">{searchError}</AdminBanner> : null}
          {result?.withoutVin.map((car) => (
            <AdminBanner key={car.carId} tone="warning">
              {carName(car)} (обява №{car.carId}) няма VIN. Скриването е по VIN, за да хване всички обяви на колата,
              затова не може да се приложи.
            </AdminBanner>
          ))}
        </form>
      </AdminCard>

      {result && result.choices.length > 0 ? (
        <AdminCard className="flex flex-col gap-3">
          <h2 className="text-base font-black text-ink">Номерът съвпада с няколко автомобила — изберете кой</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {result.choices.map((car) => (
              <li key={car.carId}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setQuery(car.vin ?? "");
                    search(car.vin ?? "");
                  }}
                  className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-lg border border-line bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
                >
                  <span className="font-semibold text-ink">{carName(car)}</span>
                  <span className="text-xs wrap-anywhere text-muted">
                    VIN {car.vin} · {car.via === "id" ? `обява №${car.carId}` : "номер на лот"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {candidates.length > 0 ? (
        <AdminCard className="@container flex flex-col gap-4">
          <div>
            <h2 className="text-base font-black wrap-anywhere text-ink">
              VIN {result?.vin} — {count}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Един автомобил може да има няколко обяви (пре-листване, Copart→IAAI). Всички по-долу ще бъдат скрити
              заедно.
            </p>
          </div>

          <CandidateCards candidates={candidates} />
          <CandidateTable candidates={candidates} />

          {!allSuppressed ? (
            <div className="grid gap-3 @lg:grid-cols-2">
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

          <div className="flex flex-wrap gap-2">
            {!allSuppressed ? (
              <AdminButton variant="danger" size="lg" disabled={pending} onClick={() => setConfirming("apply")}>
                Скрий от сайта и търсачките
              </AdminButton>
            ) : null}
            {anySuppressed ? (
              <AdminButton variant="secondary" size="lg" disabled={pending} onClick={() => setConfirming("revoke")}>
                Възстанови
              </AdminButton>
            ) : null}
          </div>
          {feedback ? <AdminBanner tone={feedback.tone}>{feedback.text}</AdminBanner> : null}
        </AdminCard>
      ) : null}

      <ConfirmDialog
        isOpen={confirming === "apply"}
        tone="danger"
        title="Скриване на обявите"
        confirmLabel="Скрий"
        isPending={pending}
        onConfirm={confirmApply}
        onCancel={() => setConfirming(null)}
        message={
          <span className="block space-y-2 text-left">
            <span className="block">
              {count} за VIN <b>{result?.vin}</b> ще върнат <b>410 Gone</b> и ще изчезнат от каталога, картата на сайта
              и филтрите.
            </span>
            <span className="block text-sm text-muted">
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
        confirmLabel="Възстанови"
        isPending={pending}
        onConfirm={confirmRevoke}
        onCancel={() => setConfirming(null)}
        message={
          <span className="block space-y-2 text-left">
            <span className="block">
              {count} за VIN <b>{result?.vin}</b> отново ще се виждат в сайта, каталога и картата на сайта.
            </span>
            <span className="block text-sm text-muted">
              Заявката остава в регистъра като отменена. Търсачките ще ги обходят отново по свой график.
            </span>
          </span>
        }
      />
    </div>
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
  return hidden ? (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 ring-1 ring-rose-200 ring-inset">
      скрита
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line ring-inset">
      видима
    </span>
  );
}

/** Opens the public page in a new tab — for checking the listing before charging. */
function CarLink({ c }: { c: DeindexCandidate }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noreferrer"
      className="-my-2.5 inline-block py-2.5 font-semibold wrap-anywhere text-brand hover:underline"
    >
      {c.url}
    </a>
  );
}

/** Below the table's container width: one card per listing. */
function CandidateCards({ candidates }: { candidates: DeindexCandidate[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 @3xl:hidden">
      {candidates.map((c) => (
        <li key={c.carId} className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2.5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <CarLink c={c} />
            <StateBadge hidden={c.deindexedAt !== null} />
          </div>
          <span className="text-ink">{carName(c)}</span>
          <span className="text-xs text-muted">
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
    <div className="hidden overflow-hidden rounded-lg border border-line @3xl:block">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
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
              <td className="px-3 py-2">
                <CarLink c={c} />
              </td>
              <td className="px-3 py-2 text-ink">{carName(c)}</td>
              <td className="px-3 py-2 text-muted">
                {c.lotNumber ?? "—"}
                {c.domainName ? ` · ${c.domainName}` : ""}
              </td>
              <td className="px-3 py-2 text-muted">{listedLabel(c)}</td>
              <td className="px-3 py-2">
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
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={ADMIN_LABEL}>
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
