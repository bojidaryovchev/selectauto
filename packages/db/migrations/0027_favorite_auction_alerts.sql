-- 0027_favorite_auction_alerts.sql
-- Per-user opt-in for the "любими автомобили с търг днес" email digest.
--
-- The website already lets a signed-in user favourite cars (favorites table,
-- 0019). This adds a standing preference on the user so a daily Vercel Cron can
-- email each opted-in user the favourites whose auction lands TODAY (the same
-- America/New_York "Днес" window the catalog's auctionWindow filter uses —
-- see apps/web/src/lib/car-listing-conditions.ts).
--
--   favorite_auction_alerts        — the opt-in toggle. Default OFF; a user
--                                    turns it on from /lyubimi.
--   favorite_auction_alert_sent_on — the America/New_York auction DAY we last
--                                    sent this user a digest for. The cron skips
--                                    any user whose value already equals today's
--                                    NY day, so a duplicate or retried invocation
--                                    (Vercel cron delivery is best-effort and can
--                                    double-fire) never sends two digests for the
--                                    same day. NULL = never sent.
--
-- Both columns live on the Auth.js `users` table (same place as our custom
-- `password_hash`), since the opt-in is a single global preference per user.
-- Keep in sync with the `users` pgTable in packages/db/schema.ts.

ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_auction_alerts BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_auction_alert_sent_on DATE;
