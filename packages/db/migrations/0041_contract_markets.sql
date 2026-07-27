-- 0041_contract_markets.sql
-- Four markets instead of two (owner, 07.2026). The spec grouped САЩ+Канада as
-- one USD contract type and knew nothing about Европа, but the signed contracts
-- show four different shapes:
--
--   us — посредничество, USD, 5 пера → 4 етапа
--   ca — посредничество, EUR, 4 пера → 3 етапа; перо 1 is quoted in CAD and
--        converted with a rate fixed at contract creation (the first payment is
--        wired to ALCO IMPEX in Canadian dollars)
--   kr — посредничество, EUR, 5 пера → 4 етапа
--   eu — договор за ДОСТАВКА, EUR с ДДС, 3 пера → 2 етапа (търг + финално)
--
-- The пера keep mapping onto the existing amount_* columns (Канада's combined
-- "кола + транспорт" lives in amount_car, Европа's "цена на стоките" likewise),
-- and the stage rows in contract_payments were never fixed at four — the market
-- definition in apps/web/src/constants/contracts.ts decides how many exist.
--
-- New columns hold the Canadian dual-currency перо 1:
--   amount_car_foreign — the amount as wired, in foreign_currency (CAD)
--   foreign_rate       — CAD→EUR rate entered once at contract creation and
--                        reused on the payment notice
--   amount_car (existing) keeps the EUR equivalent, which is the contract's
--   leading amount ("17 813 евро, равностойни на 28 386 канадски долара").
--
-- Keep in sync with packages/db/schema.ts.

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS amount_car_foreign NUMERIC(12,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS foreign_currency   TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS foreign_rate       NUMERIC(12,6);

-- The old combined market value never reached production, but map it anyway so
-- the migration is safe on any environment that did create one.
UPDATE contracts SET market = 'us' WHERE market = 'us_ca';
