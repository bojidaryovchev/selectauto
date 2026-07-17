-- 0029_admin_and_lead_lifecycle.sql
-- Admin panel groundwork: an owner-facing back office for the three lead types
-- (carfax_requests, inquiries, calculator_offers). Two parts:
--
-- 1) `users.role` — authorises the /admin area. Default 'user'; the owner is
--    promoted to 'admin' MANUALLY after their first sign-in (see note below —
--    we don't hardcode an email here). The role rides on the Auth.js JWT (set in
--    the `jwt` callback from a DB read at sign-in) so /admin gating needs no
--    per-request DB lookup. Values: 'user' | 'admin'.
--
-- 2) Lead lifecycle columns on each of the three lead tables so the owner can
--    WORK the leads (not just read them):
--      status      — where the lead is in the pipeline. Default 'new'.
--                    Values: 'new' | 'contacted' | 'won' | 'lost' | 'archived'.
--      admin_notes — free-text follow-up log the owner keeps per lead.
--      updated_at  — bumped by the admin mutations on any status/notes change
--                    (DEFAULT now() so existing rows get a sane initial value).
--    Each gets a status index for the inbox's status filter.
--
-- All three lead tables were previously insert-only (created_at only). These
-- columns are the minimum a lightweight CRM inbox needs. Keep in sync with the
-- `users`, `carfaxRequests`, `inquiries`, `calculatorOffers` pgTables in
-- packages/db/schema.ts.

-- 1) Admin role on users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- No owner is promoted here (we don't hardcode an email in the schema). To grant
-- access: the owner signs in ONCE (creating their users row), then is promoted to
-- 'admin' manually — e.g. in Drizzle Studio (`pnpm db:studio`) set users.role to
-- 'admin' for their account, or run:
--   UPDATE users SET role = 'admin' WHERE lower(email) = lower('<owner-email>');
-- The role is read onto the JWT at sign-in, so the owner must sign OUT and back
-- IN after promotion for the /admin gate to see role='admin'.

-- 2) Lifecycle columns on carfax_requests.
ALTER TABLE carfax_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE carfax_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE carfax_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS carfax_requests_status_idx ON carfax_requests (status);

-- 2) Lifecycle columns on inquiries.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);

-- 2) Lifecycle columns on calculator_offers.
ALTER TABLE calculator_offers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE calculator_offers ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE calculator_offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS calculator_offers_status_idx ON calculator_offers (status);
