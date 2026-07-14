-- 0018_favorites.sql
-- User favourites — ORIGINAL version (superseded). This created the `favorites`
-- table with a `clerk_user_id` owner column for the initial Clerk-based auth.
--
-- ⚠️ Auth was later moved off Clerk to self-hosted Auth.js. Migration 0019 DROPS
-- and recreates this table with a `user_id` column (Auth.js user ids), so the
-- shape below is historical. It's kept verbatim because it was already applied to
-- the DB (the migration runner tracks it); editing applied migrations would not
-- re-run them. See 0019_auth.sql for the current `favorites` shape + schema.ts.

BEGIN;

CREATE TABLE IF NOT EXISTS favorites (
  clerk_user_id  TEXT NOT NULL,
  car_id         INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, car_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites (clerk_user_id, created_at DESC);

COMMIT;
