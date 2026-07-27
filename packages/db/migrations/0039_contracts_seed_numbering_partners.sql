-- 0039_contracts_seed_numbering_partners.sql
-- Go-live data for the contracts module, confirmed by the owner (07.2026):
--
--  1. Numbering continues the existing PAPER series, so the system's first
--     generated documents follow on from the last hand-written ones:
--       * mediation contracts — next free number is 2026-094 (the series is
--         SHARED across САЩ / Канада / Европа / Корея), so last_no = 93;
--       * deposit contracts   — next free number is 2026-050 (own independent
--         series), so last_no = 49.
--     Seeded, not hardcoded: the minting logic in create-contract /
--     create-deposit just increments whatever the counter holds.
--
--  2. International partners (spec §5.1/§7.2 — direct payment for stage 1/2):
--       * САЩ    — CARGOLOOP
--       * Корея  — SSANCAR
--       * Канада — ALCO IMPEX INC (full wire details supplied)
--     CARGOLOOP and SSANCAR are inserted INACTIVE because their bank details
--     are still missing; an inactive recipient is never offered on a payment
--     stage, so a notice can't be generated against incomplete data. Fill them
--     in at /admin/poluchateli and tick „Активен" to enable them.
--
--  3. `routing_code` — Canadian wires quote a routing code alongside SWIFT
--     (ALCO IMPEX: CC000100381), which no existing column covered.
--
-- Keep in sync with packages/db/schema.ts.

ALTER TABLE payment_recipients ADD COLUMN IF NOT EXISTS routing_code TEXT;

INSERT INTO contract_counters (series, year, last_no) VALUES
  ('contract', 2026, 93),
  ('deposit',  2026, 49)
ON CONFLICT (series, year) DO NOTHING;

INSERT INTO payment_recipients
  (slug, kind, name, country, address, vat_number, bank_name, bank_address, iban, swift_bic, routing_code, currency, charges_instruction, payment_method, active)
VALUES
  ('alco_impex', 'international_partner', 'ALCO IMPEX INC', 'Canada',
   '2608 BLVD JEAN-BAPTISTE, LACHINE QC H8T1C9 CANADA', NULL,
   'Bank of Montreal', '129 rue Saint-Jacques, Montréal, QC, H2Y 1L6, CA',
   '00381987899', 'BOFMCAM2XXX', 'CC000100381', 'CAD', NULL, NULL, TRUE),
  ('cargoloop', 'international_partner', 'CARGOLOOP', 'САЩ',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'USD', NULL, NULL, FALSE),
  ('ssancar', 'international_partner', 'SSANCAR', 'Корея',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'EUR', NULL, NULL, FALSE)
ON CONFLICT (slug) DO NOTHING;
