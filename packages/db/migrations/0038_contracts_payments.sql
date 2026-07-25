-- 0038_contracts_payments.sql
-- Contracts & payments module (техническо задание "договори и плащания" — see
-- docs/contracts-payments-plan.md). The mediation contract (договор за
-- посредничество) is the single source of truth: client, car, and the five
-- financial points are entered ONCE; saving a contract auto-creates its four
-- payment stages; payment notices are generated per stage as immutable,
-- versioned snapshots.
--
--   clients             — one row per client (физическо/юридическо лице); gives
--                         the deposit flow a client identity across contracts.
--   payment_recipients  — the admin-managed "Получатели" settings (§8): bank
--                         details per recipient; seeded with SelectAuto,
--                         Auto America B.V and Lean Customs BV.
--   contract_counters   — per-series/year number minting (2026-088 style),
--                         atomic via INSERT..ON CONFLICT..RETURNING.
--   contracts           — the mediation contract (US/CA=USD or KR=EUR): client
--                         snapshot, car data, points 1–5, total.
--   contract_payments   — exactly 4 stage rows per contract (Кола, Транспорт,
--                         Мито и ДДС, Финално), created in the same transaction.
--   deposit_contracts   — the deposit contract module (§14), own number series;
--                         linked from contracts.deposit_contract_id when used.
--   generated_documents — append-only versioned PDFs (payment notices + contract
--                         documents) with the full render snapshot (§2/§6/§9).
--   payment_attachments — uploaded proof-of-payment files (S3 keys) per stage.
--   contract_events     — append-only audit trail (§9): who did what, when.
--
-- Keep in sync with the pgTables in packages/db/schema.ts.

CREATE TABLE IF NOT EXISTS clients (
  id             SERIAL PRIMARY KEY,
  -- 'individual' (физическо лице) | 'company' (юридическо лице)
  kind           TEXT NOT NULL,
  -- Three names or company name, depending on kind.
  name           TEXT NOT NULL,
  egn            TEXT,
  eik            TEXT,
  vat_number     TEXT,
  address        TEXT,
  representative TEXT,
  phone          TEXT,
  email          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_name_idx ON clients (name);
CREATE INDEX IF NOT EXISTS clients_egn_idx ON clients (egn);
CREATE INDEX IF NOT EXISTS clients_eik_idx ON clients (eik);

CREATE TABLE IF NOT EXISTS payment_recipients (
  id                  SERIAL PRIMARY KEY,
  -- Stable reference for the built-in recipients ('selectauto', 'auto_america',
  -- 'lean_customs'); NULL for admin-added international partners.
  slug                TEXT UNIQUE,
  -- 'selectauto' | 'international_partner' | 'customs_broker'
  kind                TEXT NOT NULL,
  name                TEXT NOT NULL,
  country             TEXT,
  address             TEXT,
  vat_number          TEXT,
  bank_name           TEXT,
  bank_address        TEXT,
  iban                TEXT,
  swift_bic           TEXT,
  currency            TEXT,
  -- Разноски на превода — OUR/SHA or verbatim text ("За сметка на изпращача").
  charges_instruction TEXT,
  -- Вид плащане shown on the notice (e.g. "BLINK" for SelectAuto).
  payment_method      TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_recipients_kind_idx ON payment_recipients (kind, active);

CREATE TABLE IF NOT EXISTS contract_counters (
  -- 'contract' | 'deposit' — the two independent number series.
  series  TEXT NOT NULL,
  year    INTEGER NOT NULL,
  last_no INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (series, year)
);

CREATE TABLE IF NOT EXISTS deposit_contracts (
  id              SERIAL PRIMARY KEY,
  -- Visible number, e.g. '2026-047' (own series, independent of contracts).
  number          TEXT NOT NULL UNIQUE,
  deposit_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id       INTEGER NOT NULL REFERENCES clients (id),
  -- Client data frozen at creation — later client edits never change the document.
  client_snapshot JSONB NOT NULL,
  -- Free-text vehicle description from чл.1 (e.g. "ЛЕК АВТОМОБИЛ").
  vehicle_description TEXT,
  budget_amount   NUMERIC(12,2),
  budget_currency TEXT NOT NULL DEFAULT 'EUR',
  deposit_amount  NUMERIC(12,2) NOT NULL,
  -- 'draft' | 'signed' | 'paid' | 'used' | 'returned' | 'cancelled'
  status          TEXT NOT NULL DEFAULT 'draft',
  created_by      TEXT,
  updated_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposit_contracts_client_idx ON deposit_contracts (client_id, status);
CREATE INDEX IF NOT EXISTS deposit_contracts_created_at_idx ON deposit_contracts (created_at);

CREATE TABLE IF NOT EXISTS contracts (
  id                  SERIAL PRIMARY KEY,
  -- Visible number, e.g. '2026-088'. Documents link by `id` (the internal key);
  -- the number is for humans/print.
  number              TEXT NOT NULL UNIQUE,
  contract_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  -- 'us_ca' (САЩ/Канада, USD) | 'kr' (Корея, EUR). Fixes template + currency.
  market              TEXT NOT NULL,
  currency            TEXT NOT NULL,
  client_id           INTEGER NOT NULL REFERENCES clients (id),
  client_snapshot     JSONB NOT NULL,
  -- Car data (§3.4).
  car_year            INTEGER,
  car_make            TEXT,
  car_model           TEXT,
  vin                 TEXT,
  purchase_market     TEXT,
  auction_platform    TEXT,
  -- The five financial points (§3.5), entered once at creation.
  amount_car             NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_transport       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_customs_vat     NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_transport_eu_bg NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_commission      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Основание за плащане; defaults to "Договор № {number}" at creation.
  payment_basis       TEXT,
  -- Set when an active deposit was applied to payment 1 (§14). UNIQUE index
  -- below = a deposit is usable exactly once (the link lives here, not on the
  -- deposit row, to avoid a circular FK).
  deposit_contract_id INTEGER REFERENCES deposit_contracts (id),
  deposit_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- 'draft' | 'active' | 'fully_paid' | 'cancelled'
  status              TEXT NOT NULL DEFAULT 'active',
  created_by          TEXT,
  updated_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contracts_deposit_contract_ux
  ON contracts (deposit_contract_id) WHERE deposit_contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contracts_client_idx ON contracts (client_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts (status);
CREATE INDEX IF NOT EXISTS contracts_created_at_idx ON contracts (created_at);
CREATE INDEX IF NOT EXISTS contracts_vin_idx ON contracts (vin);

CREATE TABLE IF NOT EXISTS contract_payments (
  id           SERIAL PRIMARY KEY,
  contract_id  INTEGER NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
  -- 'vehicle' (т.1) | 'transport' (т.2) | 'customs_vat' (т.3) | 'final' (т.4+т.5)
  stage        TEXT NOT NULL,
  -- Snapshot of the stage's due sum at contract save (vehicle = т.1 − deposit;
  -- final = т.4 + т.5). Kept in sync when an authorized user edits the contract.
  due_amount   NUMERIC(12,2) NOT NULL,
  currency     TEXT NOT NULL,
  -- Chosen recipient (validated per stage: vehicle/transport → selectauto or
  -- international_partner; customs_vat → auto_america/lean_customs; final →
  -- always selectauto). NULL until first chosen.
  recipient_id INTEGER REFERENCES payment_recipients (id),
  -- Per-stage основание (customs operations get their own reference — §5.3).
  basis        TEXT,
  due_date     DATE,
  -- 'not_requested' | 'awaiting_payment' | 'partially_paid' | 'paid' |
  -- 'overdue' | 'cancelled'
  status       TEXT NOT NULL DEFAULT 'not_requested',
  paid_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at      DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, stage)
);

CREATE INDEX IF NOT EXISTS contract_payments_status_idx ON contract_payments (status);

CREATE TABLE IF NOT EXISTS generated_documents (
  id                  SERIAL PRIMARY KEY,
  -- 'payment_notice' | 'contract' | 'deposit_contract'
  kind                TEXT NOT NULL,
  contract_id         INTEGER REFERENCES contracts (id),
  payment_id          INTEGER REFERENCES contract_payments (id),
  deposit_contract_id INTEGER REFERENCES deposit_contracts (id),
  version             INTEGER NOT NULL,
  recipient_id        INTEGER REFERENCES payment_recipients (id),
  -- The COMPLETE render payload frozen at generation: issuer/client/car blocks,
  -- line items (incl. the negative deposit line), amounts, recipient bank data,
  -- основание, rate. Later edits to contract/recipient never touch this (§2).
  snapshot            JSONB NOT NULL,
  -- USD→EUR conversion snapshot — only for us_ca notices to SelectAuto (§16).
  amount_usd          NUMERIC(12,2),
  usd_eur_rate        NUMERIC(12,6),
  amount_eur          NUMERIC(12,2),
  pdf_s3_key          TEXT,
  generated_by        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One version sequence per payment stage (notices)…
CREATE UNIQUE INDEX IF NOT EXISTS generated_documents_payment_version_ux
  ON generated_documents (payment_id, version) WHERE payment_id IS NOT NULL;
-- …per deposit contract document…
CREATE UNIQUE INDEX IF NOT EXISTS generated_documents_deposit_version_ux
  ON generated_documents (deposit_contract_id, version)
  WHERE deposit_contract_id IS NOT NULL AND kind = 'deposit_contract';
-- …and per mediation contract document (rows with no payment_id).
CREATE UNIQUE INDEX IF NOT EXISTS generated_documents_contract_version_ux
  ON generated_documents (contract_id, kind, version)
  WHERE contract_id IS NOT NULL AND payment_id IS NULL;
CREATE INDEX IF NOT EXISTS generated_documents_contract_idx ON generated_documents (contract_id);

CREATE TABLE IF NOT EXISTS payment_attachments (
  id           SERIAL PRIMARY KEY,
  payment_id   INTEGER NOT NULL REFERENCES contract_payments (id) ON DELETE CASCADE,
  s3_key       TEXT NOT NULL,
  filename     TEXT NOT NULL,
  content_type TEXT,
  size_bytes   BIGINT,
  uploaded_by  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_attachments_payment_idx ON payment_attachments (payment_id);

CREATE TABLE IF NOT EXISTS contract_events (
  id         BIGSERIAL PRIMARY KEY,
  -- 'contract' | 'payment' | 'deposit' | 'recipient' | 'client'
  entity     TEXT NOT NULL,
  entity_id  INTEGER NOT NULL,
  -- e.g. 'created' | 'updated' | 'status_changed' | 'document_generated' |
  -- 'marked_paid' | 'payment_reverted' | 'attachment_added'
  action     TEXT NOT NULL,
  actor_id   TEXT,
  -- Structured detail (old→new diffs, generated version, amounts…).
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_events_entity_idx ON contract_events (entity, entity_id, created_at);

-- Seed the built-in recipients (bank details from the live payment notices).
-- Idempotent via the slug unique key; an admin can edit everything later in
-- /admin/poluchateli except deleting the SelectAuto row.
INSERT INTO payment_recipients
  (slug, kind, name, country, address, vat_number, bank_name, bank_address, iban, swift_bic, currency, charges_instruction, payment_method, active)
VALUES
  ('selectauto', 'selectauto', 'СЕЛЕКТАУТО ИМПОРТ ЕООД', 'България',
   'гр. Пловдив, ул. "Лазо Войвода" № 19', 'BG208786079',
   'ОББ', 'България', 'BG38UBBS80021477259910', 'UBBSBGSF', 'EUR',
   NULL, 'BLINK', TRUE),
  ('auto_america', 'customs_broker', 'Auto America B.V', 'The Netherlands',
   'Bosland 8', 'NL863164274B01',
   'ING bank', 'The Netherlands', 'NL42INGB0674607880', 'INGBNL2A', 'EUR',
   'За сметка на изпращача', NULL, TRUE),
  ('lean_customs', 'customs_broker', 'Lean Customs BV', 'The Netherlands',
   'Het Holland 2 A 6921 GW Duiven', 'NL862723929B01',
   'Rabobank', 'The Netherlands', 'NL34RABO0369590007', 'RABONL2U', 'EUR',
   'За сметка на изпращача', NULL, TRUE)
ON CONFLICT (slug) DO NOTHING;
