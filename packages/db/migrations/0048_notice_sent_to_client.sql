-- 0048_notice_sent_to_client.sql
-- „За изпращане към клиента" (owner, 26.10.2026): the owner issues the payment
-- notices himself, and the person who forwards them to clients needs to SEE
-- which ones are ready and not yet sent. A notice is "to send" until someone
-- with the `notices.markSent` capability marks it sent.
--
-- ADDITIVE — two nullable columns on generated_documents; only payment notices
-- use them:
--   client_sent_at — when it was marked as forwarded to the client; NULL = to send
--   client_sent_by — users.id of who marked it (plain text, like generated_by)
--
-- Only the NEWEST version per payment stage is ever "to send" (the app reads it
-- that way): a regenerated notice supersedes the older versions.
--
-- Backfill — notices issued before this column existed: everything whose stage
-- is no longer awaiting payment (paid, overdue, …) was evidently sent already,
-- so it leaves the queue: client_sent_at = its generation time, client_sent_by
-- stays NULL — nobody recorded the sending, and the UI shows a sent date only
-- when someone did. Stages still AWAITING payment keep NULL and start in the
-- queue (11 stages on 26.10.2026, most of them issued that day), so the
-- forwarder sees them and clears the ones the owner already sent himself.
--
-- Keep in sync with packages/db/schema.ts.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS client_sent_at timestamptz;
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS client_sent_by text;

UPDATE generated_documents g
SET client_sent_at = g.created_at
FROM contract_payments p
WHERE p.id = g.payment_id
  AND g.kind = 'payment_notice'
  AND g.client_sent_at IS NULL
  AND p.status <> 'awaiting_payment';

COMMIT;
