"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MailThreadStatusSelect } from "./mail-thread-status-select";
import { MessageBody } from "./message-body";
import { ReplyComposer } from "./reply-composer";
import { markThreadRead } from "@/mutations/mail";
import type { MailThreadDetail } from "@/queries/mail";

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

  const attachmentsFor = (messageId: number) =>
    thread.attachments.filter((a) => a.messageId === messageId);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/poshta" className="text-sm font-semibold text-muted hover:text-ink">
          ← Поща
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink">
          {thread.subject || "(без тема)"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {thread.participantName ? `${thread.participantName} · ` : ""}
          {thread.participantEmail}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Статус</span>
        <MailThreadStatusSelect threadId={thread.id} value={thread.status} />
      </div>

      <ul className="space-y-3">
        {thread.messages.map((m) => {
          const outbound = m.direction === "outbound";
          const files = attachmentsFor(m.id);
          return (
            <li
              key={m.id}
              className={`rounded-2xl border p-4 ${
                outbound ? "border-brand/30 bg-brand/5" : "border-line bg-white"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-ink">
                  {outbound ? "SelectAuto" : m.fromName || m.fromAddress}
                </span>
                <span className="text-xs text-muted">
                  {new Date(m.createdAt).toLocaleString("bg-BG")}
                </span>
              </div>

              {/* A failed reply must be impossible to mistake for a sent one. */}
              {outbound && m.deliveryState === "failed" && (
                <p className="mb-2 rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">
                  НЕ е изпратено{m.deliveryError ? `: ${m.deliveryError}` : "."}
                </p>
              )}
              {outbound && m.deliveryState === "sending" && (
                <p className="mb-2 text-xs italic text-muted">изпраща се…</p>
              )}

              <MessageBody
                textBody={m.textBody}
                htmlBody={m.htmlBody}
                fetched={outbound || m.bodyFetchedAt !== null}
              />

              {files.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                      title={f.contentType ?? undefined}
                    >
                      {f.filename || "прикачен файл"}
                      {f.sizeBytes ? ` · ${Math.ceil(f.sizeBytes / 1024)} KB` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {thread.attachments.length > 0 && (
        <p className="text-xs text-muted">
          Прикачените файлове се съхраняват в Resend и още не се свалят от панела.
        </p>
      )}

      <ReplyComposer threadId={thread.id} to={thread.participantEmail} />
    </div>
  );
}
