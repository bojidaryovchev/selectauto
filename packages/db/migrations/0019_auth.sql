-- 0019_auth.sql
-- Self-hosted Auth.js (NextAuth v5) — Google OAuth + email/password (Credentials),
-- JWT sessions. Replaces the earlier Clerk-based auth. Keep in sync with the
-- users / accounts / verificationTokens / passwordResetTokens / favorites tables
-- in schema.ts.
--
-- Table shapes for users/accounts/verification_tokens match what
-- @auth/drizzle-adapter (PostgresDrizzleAdapter) expects — verified against
-- node_modules/@auth/drizzle-adapter/lib/pg.d.ts. With JWT sessions there is NO
-- `sessions` table (that's only for the database session strategy).
--
-- Additions beyond the adapter defaults:
--   users.password_hash    — bcrypt hash for the Credentials provider (OAuth-only
--                            users have it NULL; they sign in via Google).
--   password_reset_tokens  — our own forgot-password flow (Auth.js provides none
--                            for Credentials).
--
-- favorites: the original table (migration 0018) keyed favourites by a Clerk user
-- id (`clerk_user_id`). Under Auth.js the owner is an Auth.js user id, and any
-- pre-existing rows hold Clerk ids that can never match an Auth.js user — so we
-- DROP and recreate the table cleanly with `user_id`. (No production users existed
-- yet; the few rows were orphaned test data.)

BEGIN;

-- ===== Auth.js core tables =====

-- users. id is TEXT (the adapter generates a uuid string). password_hash is our
-- addition for Credentials sign-in.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  email           TEXT NOT NULL,
  email_verified  TIMESTAMPTZ,
  image           TEXT,
  password_hash   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email is the Credentials login identifier and the OAuth account-link key, so it
-- must be unique (one email = one user). Case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ux ON users (lower(email));

-- OAuth provider links (Google). Composite PK (provider, providerAccountId) per
-- the adapter. Column names are the adapter's (snake_case token fields).
CREATE TABLE IF NOT EXISTS accounts (
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,
  provider             TEXT NOT NULL,
  provider_account_id  TEXT NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           INTEGER,
  token_type           TEXT,
  scope                TEXT,
  id_token             TEXT,
  session_state        TEXT,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id);

-- Auth.js verification tokens — used here for EMAIL VERIFICATION of new
-- email/password sign-ups (identifier = email, token = opaque random). Composite
-- PK (identifier, token).
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL,
  expires     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Our own forgot-password tokens (single-use, expiring).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires     TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id);

-- ===== favorites: drop the Clerk-shaped table and recreate with user_id =====
-- (The index dies with the table; recreated below.)
DROP TABLE IF EXISTS favorites;

-- One row per (Auth.js user, physical car). The owner is an Auth.js user id
-- (opaque TEXT) — no FK to users so a favourite isn't blocked by adapter timing,
-- and a user delete is handled at the app layer. car_id references cars(id) — the
-- stable car identity across car_listings / CarView.id / /avtomobil/[id] — so a
-- favourite survives relisting/archival; ON DELETE CASCADE cleans it if a car is
-- purged. Composite PK makes the favourite a set membership (idempotent toggle).
CREATE TABLE favorites (
  user_id     TEXT NOT NULL,
  car_id      INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, car_id)
);

-- Lists a user's favourites newest-first + powers the per-user id-set lookup the
-- catalog uses to seed heart state.
CREATE INDEX favorites_user_idx ON favorites (user_id, created_at DESC);

COMMIT;
