-- 0045_admin_mail.sql
-- The admin mail inbox: persist what arrives at info@selectauto.bg and what we
-- reply with, so the back office can hold a real conversation.
--
-- ADDITIVE ONLY — three new tables, nothing existing is touched.
--
-- ── Why this has to exist at all ────────────────────────────────────────────
-- selectauto.bg's apex MX points at Resend's receiving endpoint, and Resend
-- receiving offers no IMAP/POP. There is therefore NO mailbox behind the site's
-- published contact address: mail is accepted, stored by Resend, and visible
-- only in their dashboard. `/api/resend-inbound` forwards a copy to a human
-- inbox, but a forwarded copy cannot be REPLIED to (the reply would go back to
-- info@, i.e. back into Resend). These tables are what let the panel reply.
--
-- ── Why the References chain is a column, not an afterthought ───────────────
-- Resend keeps no conversation state. Gmail/Outlook thread on the RFC-2822
-- `In-Reply-To` + `References` headers, so a correct multi-turn reply has to
-- send the ACCUMULATED chain — which means we have to store it.
--
-- ── Retention warning (docs/admin-mail-and-deindex-plan.md §4.7) ────────────
-- This archive will accumulate arbitrary customer content: ЕГН, ID scans,
-- талони, bank details. That is a NEW processing purpose which the current
-- privacy policy (worded around account data) does not cover, and there is no
-- deletion job here. Retention must be decided before this is used in anger.

BEGIN;

-- ── Threads ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_threads (
  id                serial PRIMARY KEY,
  subject           text,
  -- The human on the other end. Bare lower-cased address; the display name is
  -- kept separately because it changes between messages.
  participant_email text        NOT NULL,
  participant_name  text,
  -- Mirrors the lead lifecycle vocabulary already used by migration 0029.
  status            text        NOT NULL DEFAULT 'new',
  assigned_to       text        REFERENCES users (id) ON DELETE SET NULL,
  -- Denormalised from the newest message so the list view needs no join.
  last_message_at   timestamptz NOT NULL DEFAULT now(),
  last_direction    text        NOT NULL DEFAULT 'inbound',
  -- Cleared when an admin opens the thread; set again by a new inbound message.
  unread            boolean     NOT NULL DEFAULT true,
  -- Accumulated RFC Message-IDs, oldest first, angle brackets retained. Sent as
  -- the `References` header on every reply so clients keep the thread together.
  references_chain  text[]      NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_threads_status_chk
    CHECK (status IN ('new', 'in_progress', 'closed')),
  CONSTRAINT email_threads_last_direction_chk
    CHECK (last_direction IN ('inbound', 'outbound'))
);

COMMENT ON TABLE email_threads IS
  'One conversation with one external participant at info@selectauto.bg. There is no mailbox behind that address (Resend receiving has no IMAP/POP), so these rows are the ONLY durable record of the exchange — including of what we sent, which appears in no Sent folder anywhere.';
COMMENT ON COLUMN email_threads.references_chain IS
  'Accumulated RFC Message-IDs (oldest first, angle brackets kept). Resend holds no conversation state, so this is what a reply''s References header is built from.';

CREATE INDEX IF NOT EXISTS email_threads_last_message_at_idx
  ON email_threads (last_message_at DESC);
CREATE INDEX IF NOT EXISTS email_threads_status_idx
  ON email_threads (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS email_threads_participant_idx
  ON email_threads (participant_email);
-- Partial: the "needs attention" list is the default view and is tiny.
CREATE INDEX IF NOT EXISTS email_threads_unread_idx
  ON email_threads (last_message_at DESC) WHERE unread;

-- ── Messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_messages (
  id                serial PRIMARY KEY,
  thread_id         integer     NOT NULL REFERENCES email_threads (id) ON DELETE CASCADE,
  direction         text        NOT NULL,

  -- INBOUND: Resend's received-email id. UNIQUE because webhook delivery is
  -- at-least-once — this is what makes a redelivered event a no-op instead of a
  -- duplicate row in the inbox.
  resend_email_id   text UNIQUE,
  -- OUTBOUND: the id returned by emails.send(), so a later bounce/complaint
  -- webhook can be correlated back to the message it belongs to.
  resend_send_id    text,

  -- RFC-2822 threading headers. message_id keeps its angle brackets so it can be
  -- used verbatim in In-Reply-To / References.
  message_id        text,
  in_reply_to       text,
  references_header text[]      NOT NULL DEFAULT '{}',

  from_address      text        NOT NULL,
  from_name         text,
  -- The sender's own Reply-To, when they set one. A reply MUST prefer this over
  -- From — mailing lists, ticketing systems and "no-reply" senders all rely on
  -- it. Only known once the body is fetched (it is not in the webhook payload).
  reply_to_address  text,
  to_addresses      text[]      NOT NULL DEFAULT '{}',
  cc_addresses      text[]      NOT NULL DEFAULT '{}',
  -- Which alias Resend actually accepted delivery FOR. The MX is a catch-all, so
  -- this is the reliable routing signal (the To: header can be anything).
  received_for      text[]      NOT NULL DEFAULT '{}',

  subject           text,
  text_body         text,
  html_body         text,
  headers           jsonb,

  -- NULL ⇒ we hold only the webhook's METADATA and have not fetched the body
  -- yet. Resend's email.received payload deliberately excludes body/headers/
  -- attachments, so a second API call is always required; it is deferred so a
  -- burst of inbound cannot starve user-facing sends of the shared 10 req/s.
  body_fetched_at   timestamptz,

  sent_by_user_id   text        REFERENCES users (id) ON DELETE SET NULL,
  delivery_state    text,
  delivery_error    text,
  has_attachments   boolean     NOT NULL DEFAULT false,

  -- The message's OWN timestamp (Resend's created_at for inbound), not row
  -- insert time: webhook order is not guaranteed, so the thread must be ordered
  -- by this.
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_messages_direction_chk
    CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT email_messages_delivery_state_chk
    CHECK (delivery_state IS NULL OR delivery_state IN ('sending', 'sent', 'failed', 'bounced', 'complained'))
);

COMMENT ON COLUMN email_messages.resend_email_id IS
  'Resend received-email id. UNIQUE — the dedupe key for at-least-once webhook delivery.';
COMMENT ON COLUMN email_messages.body_fetched_at IS
  'When the body was pulled via emails.receiving.get(). NULL = metadata only. Fetched lazily on first admin open plus a reconcile cron, deliberately NOT inline in the webhook (Resend rate-limits 10 req/s per TEAM, shared with password-reset and verification sends).';
COMMENT ON COLUMN email_messages.created_at IS
  'The MESSAGE time, not the row insert time — webhook delivery order is not guaranteed, so threads are ordered by this.';

CREATE INDEX IF NOT EXISTS email_messages_thread_idx
  ON email_messages (thread_id, created_at);
-- Threading lookup: given an inbound In-Reply-To / References, find the thread.
CREATE INDEX IF NOT EXISTS email_messages_message_id_idx
  ON email_messages (message_id) WHERE message_id IS NOT NULL;
-- Correlate a later bounce/complaint webhook back to the reply that caused it.
CREATE INDEX IF NOT EXISTS email_messages_send_id_idx
  ON email_messages (resend_send_id) WHERE resend_send_id IS NOT NULL;
-- The reconcile cron's work list.
CREATE INDEX IF NOT EXISTS email_messages_pending_body_idx
  ON email_messages (created_at) WHERE body_fetched_at IS NULL AND direction = 'inbound';

-- ── Attachments ─────────────────────────────────────────────────────────────
-- Metadata only. Resend's download URLs expire after 1 hour, so they are NEVER
-- stored; bytes are either re-fetched on demand or copied into the existing
-- private documents bucket (lib/s3.ts) and referenced by s3_key.
CREATE TABLE IF NOT EXISTS email_attachments (
  id                   serial PRIMARY KEY,
  message_id           integer     NOT NULL REFERENCES email_messages (id) ON DELETE CASCADE,
  resend_attachment_id text,
  filename             text,
  content_type         text,
  content_disposition  text,
  content_id           text,
  size_bytes           bigint,
  s3_key               text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_attachments IS
  'Attachment METADATA. Resend download_urls expire in 1 hour and are never persisted — fetch on demand, or copy the bytes into the private bucket and record s3_key.';

CREATE INDEX IF NOT EXISTS email_attachments_message_idx
  ON email_attachments (message_id);

COMMIT;
