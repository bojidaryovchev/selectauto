-- 0031_user_roles_array.sql
-- Generalise users.role (single TEXT, added in 0029) → users.roles (TEXT[]) so an
-- account can hold MULTIPLE roles (admin today; editor/support/… later) without a
-- schema change. The array holds only ELEVATED roles — a plain visitor has an
-- empty array `{}`. This keeps the door open for lightweight RBAC (a role→
-- capability map in code, src/constants/admin.ts) without introducing roles/
-- permissions join tables, which would be over-engineering at this scale.
--
-- Migration of 0029's single-value column: an 'admin' becomes ARRAY['admin'];
-- plain 'user' rows carry no elevated role (stay '{}'). Then the old column is
-- dropped. Keep in sync with the `users` pgTable in packages/db/schema.ts.
--
-- The admin gate reads roles off the Auth.js JWT (stamped at sign-in), so no
-- per-request role query runs — hence no index is needed here. Add a GIN index
-- (USING GIN (roles)) only if/when a role-FILTERED query appears.

ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Carry over any elevated role from 0029's single-value column. Guarded so a
-- re-run (or a row already migrated) never duplicates the entry.
UPDATE users
SET roles = ARRAY['admin']::text[]
WHERE role = 'admin' AND NOT ('admin' = ANY(roles));

ALTER TABLE users DROP COLUMN IF EXISTS role;
