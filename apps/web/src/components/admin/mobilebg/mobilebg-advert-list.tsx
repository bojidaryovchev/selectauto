"use client";

import { AdminBanner, AdminEmptyState } from "@/components/admin/ui";
import { Button, ConfirmDialog, MakePlate } from "@/components/common";
import { MegaphoneIcon, Trash2Icon } from "@/components/icons";
import { advertUrl } from "@/lib/mobilebg/advert-url";
import { carTitle } from "@/lib/mobilebg/car-title";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { deleteMobilebgAdvert } from "@/mutations/mobilebg";
import type { MobilebgAdvertRow } from "@/queries/mobilebg";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * The register of everything we have sent to mobile.bg (boards `ab-mobilebg`, `-list`, `-sync`; parity check
 * docs/design/parity/admin-mobilebg.md).
 *
 * `failed` and `deleted` rows are shown alongside live ones deliberately: a
 * failed publish carries the error an admin needs, and a deleted row is the
 * record that we did once pay for that advert.
 *
 * Cards while the list is narrower than 896 px (two columns from 576), the kit's table above (`ab-list`, a container
 * query on the list itself). Each car carries its make's plate (decision 8).
 */

const STATUS_LABEL: Record<string, string> = {
  pending: "изпраща се",
  published: "публикувана",
  failed: "неуспешна",
  deleted: "изтрита",
};

function price(r: MobilebgAdvertRow): string {
  return r.priceEur ? `${Math.round(Number(r.priceEur)).toLocaleString("bg-BG")} €` : "при запитване";
}

function Status({ r }: { r: MobilebgAdvertRow }) {
  return <span className={`ab-ad-st is-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>;
}

/** A live advert for a car the site no longer offers — still billed weekly until deleted. In a table cell it sits on
 *  its own line under the VIN (`block`). */
function Stale({ r, block }: { r: MobilebgAdvertRow; block?: boolean }) {
  if (!r.ida || r.status === "deleted" || r.listing === "listed") return null;
  const tag = (
    <span className="sa-tag sa-tag--warn ab-st self-start">
      {r.listing === "ended" ? "търгът е приключил" : "колата не е в сайта"}
    </span>
  );
  return block ? <div className="mt-1.5">{tag}</div> : tag;
}

function Ida({ ida }: { ida: string | null }) {
  if (!ida) return <span className="ab-dim">няма</span>;
  return (
    <a href={advertUrl(ida)} target="_blank" rel="noreferrer" className="ab-ida2 hover:underline">
      {ida}
    </a>
  );
}

/** The car, to its page on the site, with its make's plate. */
function CarLink({ r, className }: { r: MobilebgAdvertRow; className?: string }) {
  return (
    <Link href={`/avtomobil/${r.carId}`} className={`ab-car hover:[&_b]:text-ortx ${className ?? ""}`}>
      {r.make ? <MakePlate name={r.make.name} logo={r.make.logo} size="xs" /> : null}
      <span>
        <b className="wrap-anywhere">{carTitle(r.year, r.title, r.carId)}</b>
      </span>
    </Link>
  );
}

export function MobilebgAdvertList({ rows }: { rows: MobilebgAdvertRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<MobilebgAdvertRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Every server call goes through here. A dropped connection rejects the call,
   * and inside a transition that rejection used to reach the page's error
   * boundary — the whole screen replaced by „Нещо се обърка". Say it in place.
   */
  function run(task: () => Promise<void>, lost = "Връзката със сървъра прекъсна. Опитайте отново.") {
    startTransition(async () => {
      try {
        await task();
      } catch {
        setError(lost);
      }
    });
  }

  function confirmDelete() {
    const ida = target?.ida;
    const carId = target?.carId;
    setTarget(null);
    if (carId === undefined) return;
    setError(null);
    setNotice(null);
    run(async () => {
      const res = await deleteMobilebgAdvert(carId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      if (res.data.alreadyGone) {
        setNotice(`Обява ${ida ?? ""} вече беше изтрита в mobile.bg — тук също е отбелязана като изтрита.`);
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <AdminEmptyState icon={<MegaphoneIcon />} title="Няма изпратени обяви." />;
  }

  const canDelete = (r: MobilebgAdvertRow) => Boolean(r.ida) && r.status !== "deleted";
  const deleteButton = (r: MobilebgAdvertRow) => (
    <Button variant="sec" size="md" onClick={() => setTarget(r)} disabled={pending}>
      <Trash2Icon />
      Изтрийте
    </Button>
  );

  return (
    <div className="ab-stack">
      {error ? (
        <AdminBanner tone="error" className="ab-al">
          {error}
        </AdminBanner>
      ) : null}
      {notice ? (
        <AdminBanner tone="info" className="ab-al">
          {notice}
        </AdminBanner>
      ) : null}

      <div className="ab-list">
        <ul className="ab-cards">
          {rows.map((r) => (
            <li key={r.carId} className="ab-cc gap-2">
              <div className="ab-cc__h">
                <CarLink r={r} className="-my-2.5 py-2.5" />
                <Status r={r} />
              </div>
              <p className="ab-vin">
                #{r.carId}
                {r.vin ? ` · ${r.vin}` : ""}
              </p>
              <Stale r={r} />
              {r.lastError ? <p className="ab-err-t">{r.lastError}</p> : null}
              <p className="ab-tx2 text-sm">
                mobile.bg: <Ida ida={r.ida} /> · {price(r)} · {r.pictureCount === 1 ? "1 снимка" : `${r.pictureCount} снимки`}
              </p>
              <p className="ab-meta">Обновена: {formatSofiaDateTime(r.updatedAt)}</p>
              {canDelete(r) ? <div>{deleteButton(r)}</div> : null}
            </li>
          ))}
        </ul>

        <div className="ab-tbl sa-tbl-wrap">
          <table className="sa-tbl">
            <thead>
              <tr>
                <th scope="col">Автомобил</th>
                <th scope="col">mobile.bg ID</th>
                <th scope="col">Статус</th>
                <th scope="col">Цена</th>
                <th scope="col">Снимки</th>
                <th scope="col">Обновена</th>
                <th scope="col">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.carId}>
                  <td className="min-w-56">
                    <CarLink r={r} />
                    <div className="ab-vin">
                      #{r.carId}
                      {r.vin ? ` · ${r.vin}` : ""}
                    </div>
                    <Stale r={r} block />
                    {r.lastError ? <p className="ab-err-t">{r.lastError}</p> : null}
                  </td>
                  <td>
                    <Ida ida={r.ida} />
                  </td>
                  <td>
                    <Status r={r} />
                  </td>
                  <td className="mute whitespace-nowrap">{price(r)}</td>
                  <td className="mute">{r.pictureCount}</td>
                  <td className="mute whitespace-nowrap">{formatSofiaDateTime(r.updatedAt)}</td>
                  <td>{canDelete(r) ? deleteButton(r) : null}</td>
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
        confirmLabel="Изтрийте"
        isPending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
        message={
          <span className="ab-dlg-note text-tx">
            Обявата ще бъде премахната от mobile.bg (ID {target?.ida}). Изтриването е безплатно и спира седмичната
            такса; вече платени VIP/ТОП услуги не се възстановяват (Общи условия, т. I.15, I.16, II.8).
          </span>
        }
      />
    </div>
  );
}
