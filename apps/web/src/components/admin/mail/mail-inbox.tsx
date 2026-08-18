"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailStatusBadge } from "./mail-status-badge";
import { MAIL_THREAD_STATUSES, MAIL_THREAD_STATUS_META } from "@/constants/mail";
import type { MailThreadRow } from "@/queries/mail";

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
  const q = params.get("q") ?? "";

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value === null || value === "") sp.delete(key);
    else sp.set(key, value);
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `/admin/poshta?${qs}` : "/admin/poshta");
  }

  function goToPage(next: number) {
    const sp = new URLSearchParams(params.toString());
    if (next <= 1) sp.delete("page");
    else sp.set("page", String(next));
    const qs = sp.toString();
    router.push(qs ? `/admin/poshta?${qs}` : "/admin/poshta");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          defaultValue={q}
          placeholder="Търсене по имейл, име или тема…"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim() || null);
          }}
          className="h-9 min-w-56 flex-1 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none focus:border-brand"
        />

        <button
          type="button"
          onClick={() => setParam("status", null)}
          className={`h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition-colors ${
            status === "" ? "bg-brand text-white" : "border border-line bg-white text-ink"
          }`}
        >
          Всички
        </button>
        {MAIL_THREAD_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setParam("status", s)}
            className={`h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition-colors ${
              status === s ? "bg-brand text-white" : "border border-line bg-white text-ink"
            }`}
          >
            {MAIL_THREAD_STATUS_META[s].label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setParam("unread", unreadOnly ? null : "1")}
          className={`h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition-colors ${
            unreadOnly ? "bg-brand text-white" : "border border-line bg-white text-ink"
          }`}
        >
          Само непрочетени
        </button>
      </div>

      <p className="mb-2 text-sm text-muted">
        Намерени: <span className="font-bold text-ink">{total}</span>
      </p>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center text-muted">
          Няма съобщения за този филтър.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-white">
          {threads.map((t) => (
            <li key={t.id} className="border-b border-line/60 last:border-0">
              <Link
                href={`/admin/poshta/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[#fafafa]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`truncate ${t.unread ? "font-black text-ink" : "font-semibold text-ink"}`}
                  >
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
                  {t.lastDirection === "outbound" && (
                    <span className="text-muted">Вие: </span>
                  )}
                  {t.subject || "(без тема)"}
                </span>

                <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  <span>{t.participantEmail}</span>
                  <span>{t.messageCount} съобщения</span>
                  <span>{new Date(t.lastMessageAt).toLocaleString("bg-BG")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-sm text-muted">
            Страница {page} от {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Напред
          </button>
        </div>
      )}
    </div>
  );
}
