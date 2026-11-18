"use client";

import { ADMIN_INPUT, AdminEmptyState, AdminPagination, adminChipClass } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { MailIcon, SearchIcon } from "@/components/icons";
import { MAIL_THREAD_STATUSES, MAIL_THREAD_STATUS_META } from "@/constants/mail";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import type { MailThreadRow } from "@/queries/mail";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MailStatusBadge } from "./mail-status-badge";

/**
 * The mail inbox list (boards `ad-mail`, `ad-mail-states`; parity check docs/design/parity/admin-mail.md): a search
 * field and a filter row, then one line per thread (`ad-ml`: stacked on a narrow list, one row from a 56rem list).
 * Unlike the lead inbox this navigates to a dedicated thread PAGE rather than opening a drawer — a conversation plus
 * a composer needs the room, and a URL two admins can share.
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
    <div className="flex flex-col gap-5">
      <div className="ad-tools">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", q.trim() || null);
          }}
          className="ad-search"
        >
          <label htmlFor="mail-q" className="sr-only">
            Търсене
          </label>
          <span className="sa-inw ad-grow">
            <SearchIcon />
            <input
              id="mail-q"
              type="search"
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене по имейл, име или тема…"
              className={ADMIN_INPUT}
            />
          </span>
          <Button type="submit" variant="sec" size="md" className="ad-search__b shrink-0">
            Търсете
          </Button>
        </form>

        <div className="sa-chips" role="group" aria-label="Филтър по статус">
          <button
            type="button"
            aria-pressed={status === ""}
            onClick={() => setParam("status", null)}
            className={adminChipClass(status === "")}
          >
            Всички
          </button>
          {MAIL_THREAD_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setParam("status", s)}
              className={adminChipClass(status === s)}
            >
              {MAIL_THREAD_STATUS_META[s].label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setParam("unread", unreadOnly ? null : "1")}
            className={adminChipClass(unreadOnly)}
          >
            Само непрочетени
          </button>
        </div>
      </div>

      <p className="ad-count">
        Намерени: <b>{total}</b>
      </p>

      {threads.length === 0 ? (
        <AdminEmptyState title="Няма съобщения за този филтър." icon={<MailIcon />} />
      ) : (
        <ul className="ad-ml">
          {threads.map((t) => (
            <li key={t.id}>
              {/* No prefetch: a prefetch renders the whole thread page, and that
                  render pulls missing bodies from Resend and saves them — for
                  every thread in view, opened or not. */}
              <Link href={`/admin/poshta/${t.id}`} prefetch={false} className={t.unread ? "is-unread" : undefined}>
                <span className="ad-ml__who">
                  <b>{t.participantName || t.participantEmail}</b>
                  <small>{t.participantEmail}</small>
                </span>
                <span className="ad-ml__sub">
                  {t.lastDirection === "outbound" && <span>Вие: </span>}
                  {t.subject || "(без тема)"}
                </span>
                <span className="ad-ml__meta">
                  <span className="ad-em">{t.participantEmail}</span>
                  <span>{t.messageCount === 1 ? "1 съобщение" : `${t.messageCount} съобщения`}</span>
                  <span>{formatSofiaDateTime(t.lastMessageAt)}</span>
                </span>
                <span className="ad-ml__st">
                  {t.unread && <span className="ad-unread" role="img" aria-label="Непрочетено" />}
                  <MailStatusBadge status={t.status} />
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
