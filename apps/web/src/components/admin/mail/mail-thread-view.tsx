"use client";

import { AdminBanner, AdminPageHeader } from "@/components/admin/ui";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { markThreadRead } from "@/mutations/mail";
import type { MailThreadDetail } from "@/queries/mail";
import { useEffect, useRef } from "react";
import { MailThreadStatusSelect } from "./mail-thread-status-select";
import { MessageBody } from "./message-body";
import { ReplyComposer } from "./reply-composer";

/**
 * One conversation: header, the messages oldest-first, then the composer.
 *
 * Opening the thread clears its unread flag. Fired once per mount via a ref
 * guard (React runs effects twice in dev StrictMode) and deliberately NOT
 * awaited or followed by a refresh — the badge is cosmetic, and a refresh here
 * would fight the composer's own refresh.
 */
export function MailThreadView({ thread }: { thread: MailThreadDetail }) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || !thread.unread) return;
    marked.current = true;
    void markThreadRead(thread.id);
  }, [thread.id, thread.unread]);

  const attachmentsFor = (messageId: number) => thread.attachments.filter((a) => a.messageId === messageId);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        back={{ href: "/admin/poshta", label: "Поща" }}
        title={thread.subject || "(без тема)"}
        description={
          <span className="wrap-anywhere">
            {thread.participantName ? `${thread.participantName} · ` : ""}
            {thread.participantEmail}
          </span>
        }
      />

      <div className="flex max-w-xs flex-col gap-1">
        <span className="text-sm font-semibold text-muted">Статус</span>
        {/* Keyed on the server value: a reply moves the thread to „В процес“, and the
            select used to keep showing the status it was opened with. */}
        <MailThreadStatusSelect key={thread.status} threadId={thread.id} value={thread.status} />
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {thread.messages.map((m) => {
          const outbound = m.direction === "outbound";
          const files = attachmentsFor(m.id);
          return (
            <li
              key={m.id}
              className={`min-w-0 rounded-xl border p-4 ${outbound ? "border-brand/30 bg-brand/5" : "border-line bg-white"}`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 text-sm font-bold wrap-anywhere text-ink">
                  {outbound ? "SelectAuto" : m.fromName || m.fromAddress}
                </span>
                <span className="text-xs text-muted">{formatSofiaDateTime(m.createdAt)}</span>
              </div>

              {/* A failed reply must be impossible to mistake for a sent one. */}
              {outbound && m.deliveryState === "failed" && (
                <AdminBanner tone="error" className="mb-2">
                  НЕ е изпратено{m.deliveryError ? `: ${m.deliveryError}` : "."}
                </AdminBanner>
              )}
              {outbound && m.deliveryState === "sending" && (
                <p className="mb-2 text-xs text-muted italic">изпраща се…</p>
              )}

              <MessageBody textBody={m.textBody} htmlBody={m.htmlBody} fetched={outbound || m.bodyFetchedAt !== null} />

              {files.length > 0 && (
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                  {files.map((f, i) => (
                    <li key={i} className="rounded-full border border-line px-3 py-1 text-xs break-all text-muted">
                      {f.filename || "прикачен файл"}
                      {f.sizeBytes ? ` · ${Math.ceil(f.sizeBytes / 1024)} KB` : ""}
                      {f.contentType ? ` · ${f.contentType}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {thread.attachments.length > 0 && (
        <p className="text-xs text-muted">Прикачените файлове се съхраняват в Resend и още не се свалят от панела.</p>
      )}

      <ReplyComposer threadId={thread.id} to={thread.participantEmail} />
    </div>
  );
}
