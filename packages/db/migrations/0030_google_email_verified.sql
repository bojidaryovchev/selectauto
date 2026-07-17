-- 0030_google_email_verified.sql
-- Backfill users.email_verified for existing Google-OAuth users.
--
-- Auth.js (@auth/core) creates every OAuth user with `emailVerified: null` — it
-- hardcodes `createUser({ ...profile, emailVerified: null })` in
-- lib/actions/callback/handle-login.js, so Google's verified-email signal never
-- reaches the users row. As a result no Google user satisfied the
-- `email_verified IS NOT NULL` gate on the favourite-auction digest cron
-- (apps/web/src/queries/favorites/get-due-favorite-auction-alerts.query.ts) and
-- the digest silently never sent to any Google user.
--
-- Going forward the `signIn` event in apps/web/src/auth.ts stamps email_verified
-- on Google sign-in. This migration backfills users who signed up BEFORE that
-- fix. Google verifies email ownership, so marking these addresses verified is
-- correct and consistent with `allowDangerousEmailAccountLinking`
-- (apps/web/src/auth.config.ts), which already trusts Google's email verification.
--
-- Scope: only users linked to a Google account AND not already verified — a
-- password user who verified through our own flow keeps their original timestamp.
-- Idempotent: re-running matches no rows once every Google user is verified.

UPDATE users u
SET email_verified = now()
WHERE u.email_verified IS NULL
  AND EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.user_id = u.id AND a.provider = 'google'
  );
