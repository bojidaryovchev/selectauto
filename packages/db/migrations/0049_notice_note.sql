-- 0049_notice_note.sql
-- A note on each payment-notice version (owner, 02.11.2026): „Генерирай
-- известие" had no field for one, only „Отбележи като платено" did. On some
-- notices the owner asks for more than the contract sum, and what he added had
-- to be remembered until the payment came in — the notes recorded then read
-- „+519 EUR SSANCAR", „130+ CARGOLOOP". Now it is written when the notice is.
--
-- ADDITIVE — one nullable column on generated_documents; only payment notices
-- use it. INTERNAL: it is not part of the frozen `snapshot`, so the PDF the
-- client receives never prints it. Per version, not per stage, so a
-- regenerated notice keeps its own note (contract_payments.note is the payment's
-- note, and the next payment overwrites it).
--
-- Must be applied before the code that selects it is deployed.
--
-- Keep in sync with packages/db/schema.ts.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS note text;

COMMIT;
