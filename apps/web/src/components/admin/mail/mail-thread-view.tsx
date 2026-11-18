"use client";

import { AdminBanner, AdminPageHeader } from "@/components/admin/ui";
import { InfoIcon, PaperclipIcon } from "@/components/icons";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { markThreadRead } from "@/mutations/mail";
import type { MailThreadDetail } from "@/queries/mail";
import { useEffect, useRef } from "react";
import { MailThreadStatusSelect } from "./mail-thread-status-select";
import { MessageBody } from "./message-body";
import { ReplyComposer } from "./reply-composer";

/**
 * One conversation (boards `ad-thread`, `ad-thread-states`, `ad-thread-reply`; parity check
 * docs/design/parity/admin-mail.md): header, the messages oldest-first, then the composer.
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

  // Where a reply goes — the same rule as sendReply: the last inbound message's
  // Reply-To, else the participant. The composer used to name the participant
  // even when the reply went to the Reply-To address.
  const lastInbound = [...thread.messages].reverse().find((m) => m.direction === "inbound");
  const replyTo = lastInbound?.replyToAddress ?? thread.participantEmail;

  return (
    <>
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

      {/* Keyed on the server value: a reply moves the thread to „В процес“, and the
          select used to keep showing the status it was opened with. */}
      <MailThreadStatusSelect key={thread.status} threadId={thread.id} value={thread.status} />

      <ul className="ad-msgs">
        {thread.messages.map((m) => {
          const outbound = m.direction === "outbound";
          const files = attachmentsFor(m.id);
          return (
            <li key={m.id} className={outbound ? "ad-msg ad-msg--out" : "ad-msg"}>
              <div className="ad-msg__h">
                <b>{outbound ? "SelectAuto" : m.fromName || m.fromAddress}</b>
                <time dateTime={new Date(m.createdAt).toISOString()}>{formatSofiaDateTime(m.createdAt)}</time>
              </div>

              {/* A failed reply must be impossible to mistake for a sent one. */}
              {outbound && m.deliveryState === "failed" && (
                <AdminBanner tone="error" className="ad-msg__fail">
                  <p>
                    <strong>НЕ е изпратено</strong>
                    {m.deliveryError ? `: ${m.deliveryError}` : "."}
                  </p>
                </AdminBanner>
              )}
              {outbound && m.deliveryState === "sending" && (
                <p className="ad-sending">
                  <span className="sa-spin ad-spin-sm" aria-hidden="true" />
                  изпраща се…
                </p>
              )}

              <MessageBody textBody={m.textBody} htmlBody={m.htmlBody} fetched={outbound || m.bodyFetchedAt !== null} />

              {files.length > 0 && (
                <ul className="ad-files">
                  {files.map((f, i) => (
                    <li key={i} className="ad-file">
                      <PaperclipIcon />
                      <span>
                        {f.filename || "прикачен файл"}
                        {f.sizeBytes ? ` · ${Math.ceil(f.sizeBytes / 1024)} KB` : ""}
                        {f.contentType ? ` · ${f.contentType}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {thread.attachments.length > 0 && (
        <p className="ad-note">
          <InfoIcon />
          <span>Прикачените файлове се съхраняват в Resend и още не се свалят от панела.</span>
        </p>
      )}

      <ReplyComposer threadId={thread.id} to={replyTo} />
    </>
  );
}
