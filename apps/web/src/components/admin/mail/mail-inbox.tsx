"use client";

import { ADMIN_INPUT, AdminButton, AdminEmptyState, AdminPagination } from "@/components/admin/ui";
import { MAIL_THREAD_STATUSES, MAIL_THREAD_STATUS_META } from "@/constants/mail";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import type { MailThreadRow } from "@/queries/mail";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MailStatusBadge } from "./mail-status-badge";

/** A filter chip: 40 px tall, filled when active. */
function chipClass(active: boolean): string {
  return `inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
    active ? "bg-brand text-white" : "border border-line bg-white text-ink hover:bg-neutral-50"
  }`;
}

/**
 * The mail inbox list: a filter row, then one line per thread. Unlike the lead
 * inbox this navigates to a dedicated thread PAGE rather than opening a drawer —
 * a conversation plus a composer needs the room, and a URL two admins can share.
 */
export function MailInbox({
  threads,
  page,
  pageCount,
  total,
}: {
  threads: MailThreadRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const status = params.get("status") ?? "";
  const unreadOnly = params.get("unread") === "1";
  const [q, setQ] = useState(params.get("q") ?? "");

  function hrefWith(changes: Record<string, string | null>, keepPage = false): string {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    if (!keepPage) sp.delete("page");
    const qs = sp.toString();
    return qs ? `/admin/poshta?${qs}` : "/admin/poshta";
  }

  function setParam(key: string, value: string | null) {
    router.push(hrefWith({ [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParam("q", q.trim() || null);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="mail-q" className="sr-only">
          Търсене
        </label>
        <input
          id="mail-q"
          type="search"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Търсене по имейл, име или тема…"
          className={`${ADMIN_INPUT} sm:max-w-md`}
        />
        <AdminButton type="submit" variant="primary" className="shrink-0">
          Търси
        </AdminButton>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Филтър по статус">
        <button
          type="button"
          aria-pressed={status === ""}
          onClick={() => setParam("status", null)}
          className={chipClass(status === "")}
        >
          Всички
        </button>
        {MAIL_THREAD_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setParam("status", s)}
            className={chipClass(status === s)}
          >
            {MAIL_THREAD_STATUS_META[s].label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={unreadOnly}
          onClick={() => setParam("unread", unreadOnly ? null : "1")}
          className={chipClass(unreadOnly)}
        >
          Само непрочетени
        </button>
      </div>

      <p className="text-sm text-muted">
        Намерени: <span className="font-bold text-ink">{total}</span>
      </p>

      {threads.length === 0 ? (
        <AdminEmptyState title="Няма съобщения за този филтър." />
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-xl border border-line bg-white p-0">
          {threads.map((t) => (
            <li key={t.id} className="border-b border-line/60 last:border-0">
              <Link
                href={`/admin/poshta/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`min-w-0 truncate ${t.unread ? "font-black text-ink" : "font-semibold text-ink"}`}>
                    {t.participantName || t.participantEmail}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {t.unread && (
                      <span className="inline-block size-2 rounded-full bg-brand" aria-label="Непрочетено" />
                    )}
                    <MailStatusBadge status={t.status} />
                  </span>
                </div>

                <span className={`truncate text-sm ${t.unread ? "text-ink" : "text-muted"}`}>
                  {t.lastDirection === "outbound" && <span className="text-muted">Вие: </span>}
                  {t.subject || "(без тема)"}
                </span>

                <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  <span className="break-all">{t.participantEmail}</span>
                  <span>{t.messageCount} съобщения</span>
                  <span>{formatSofiaDateTime(t.lastMessageAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => hrefWith({ page: p > 1 ? String(p) : null }, true)}
      />
    </div>
  );
}
