-- 0025_rename_inquiries_columns.sql
-- Rename three `inquiries` columns whose names were misleading (2026-07-11 audit):
--     time    -> purchase_timeframe   (a TEXT quiz answer, NOT a timestamp)
--     finance -> financing_option
--     budget  -> budget_range
--
-- DEPLOY-COUPLED: dev + prod share one Neon DB, so this ships together with the
-- companion code (same commit): packages/db/schema.ts renames the Drizzle
-- properties (budgetRange/purchaseTimeframe/financingOption) and
-- apps/web/src/mutations/inquiries/create-inquiry.mutation.ts maps the unchanged
-- zod/form field names (budget/time/finance) onto the new columns. The zod schema,
-- the inquiry-modal form, and the email helper keep the client-contract field
-- names — nothing reads the renamed columns back (verified: only createdAt is read).
-- Redeploy the web app from this tree after applying so no running instance still
-- writes the old column names.
--
-- Idempotent: RENAME COLUMN has no IF EXISTS, so each is guarded on the old column
-- still being present (re-run = no-op).

BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'inquiries' AND column_name = 'time') THEN
    ALTER TABLE inquiries RENAME COLUMN "time" TO purchase_timeframe;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'inquiries' AND column_name = 'finance') THEN
    ALTER TABLE inquiries RENAME COLUMN finance TO financing_option;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'inquiries' AND column_name = 'budget') THEN
    ALTER TABLE inquiries RENAME COLUMN budget TO budget_range;
  END IF;
END $$;

COMMENT ON COLUMN inquiries.purchase_timeframe IS
  'Buyer''s purchase-timeframe quiz answer (free text, e.g. "1-3 месеца"). Renamed from "time" (0025) — it is NOT a timestamp.';
COMMENT ON COLUMN inquiries.financing_option IS
  'Buyer''s financing-preference quiz answer (free text). Renamed from "finance" (0025).';
COMMENT ON COLUMN inquiries.budget_range IS
  'Buyer''s budget-range quiz answer (free text, e.g. "10000-20000"). Renamed from "budget" (0025).';

COMMIT;
