# Contracts & Payments Module — End-to-End Plan

Source spec: `Техническо_задание_договори_и_плащания_SelectAuto_ФИНАЛ_с_депозит_и_USD_курс.pdf`
Reference material: sample payment notices (SelectAuto US/CA with USD→EUR rate, SelectAuto
Korea EUR, Auto America B.V., Lean Customs BV), sample deposit contract (№ 2026-047), and
screenshots of the old mrcars.bg workoffice (orders list with per-stage dropdowns:
Документи / Търг / Транспорт / Митница / Финални).

## 0. What the spec actually requires (condensed)

- **Two independent contract types**: deposit contract (предварителен) and mediation
  contract (договор за посредничество), each with its own auto-numbering (`2026-NNN`).
- Mediation contract types: **US/Canada (USD)** and **Korea (EUR)**; the type fixes the
  template, currency, and clauses.
- Contract holds **five financial points** (1 Кола, 2 Транспорт, 3 Мито и ДДС, 4 Транспорт
  Европа→БГ, 5 Комисионна) entered **once**; total = sum, printed in digits **and words**.
- Saving a contract auto-creates **four payment stages**: Кола (т.1), Транспорт (т.2),
  Мито и ДДС (т.3), Финално (т.4 + т.5).
- **Recipient rules per stage** (invalid options *hidden*, not disabled):
  - Кола / Транспорт → SelectAuto **or** International Partner (chosen per stage, may differ)
  - Мито и ДДС → only Auto America B.V. or Lean Customs BV (own основание field)
  - Финално → always СЕЛЕКТАУТО ИМПОРТ ЕООД, no choice
- **Payment notice generation** on demand, per stage: preview → PDF by recipient template →
  versioned, immutable snapshot (client, car, amounts, recipient bank data, rate) →
  status becomes „Очаква плащане“. Regeneration = new version, old kept.
- **Payment tracking**: statuses (Не е поискано / Неплатено-Очаква / Частично / Платено /
  Просрочено / Анулирано), mark-as-paid with date correction, real paid amount, note,
  attached proof document; remaining = due − paid; status reversible with history.
- **USD/EUR rate logic** (§16): US/CA contract **and** recipient = SelectAuto → require a
  positive USD/EUR rate at generation time; notice shows USD, rate, computed EUR
  (`amount_eur = amount_usd × rate`), SelectAuto BGN/BLINK bank details; rate snapshotted.
  Recipient = International Partner (e.g. CargoLoop) → USD only, rate field hidden/blocked.
  Korea → EUR only, no rate.
- **Deposit module** (§14): statuses Чернова / Подписан / Депозит платен / Използван /
  Върнат / Анулиран; when creating a mediation contract the system offers the client's
  active deposit for deduction from payment 1 — shown as a negative line
  („Депозит №2026-044 –500 EUR“) on the notice, total recalculated; a deposit is usable once.
- **Recipients settings** section (name, country, address, VAT, bank, bank address,
  IBAN/account, SWIFT/BIC, currency, OUR/SHA, active) — adding a partner must not require
  a new template.
- **Full audit**: who created/edited, who generated which version when, status changes,
  mark-paid timestamps, attachments; nothing overwritten or auto-deleted.

Observations from samples worth encoding:
- SelectAuto notices are paid via **BLINK to a BGN IBAN** (BG38UBBS…) even though the sum
  is in EUR — the Korea sample also shows a **лв. equivalent** (BGN fixed rate 1.95583).
  (Note: the Korea sample has an internal inconsistency — line total 15 480.00 but
  „Обща сума за плащане: 14 480 евро“ — almost certainly a 1 000 EUR deposit deduction
  done by hand; exactly what §14.2 automates. Confirm with the client.)
- Dutch recipients (Auto America / Lean Customs) notices are EUR with full recipient bank
  block + „Разноски на превода: За сметка на изпращача“ (OUR).
- Основание differs per recipient: SelectAuto → „Договор No.YYYY-NNN“; customs → a customs
  reference number (e.g. `202615960`) entered at generation time.
- The old system's list row = client, auction source + lot, VIN, car title, contract № and
  per-stage action dropdowns — a good model for our contract list UI.

## 1. Where this lands in the codebase

Everything follows existing repo conventions (see `apps/web/AGENTS.md`):

| Concern | Location / pattern |
|---|---|
| DB schema | `packages/db/schema.ts` + hand-written numbered SQL migration (next: `0038_*.sql`), applied by `migrate.mjs` |
| Reads | `apps/web/src/queries/contracts/…`, `queries/deposits/…`, `queries/recipients/…` |
| Writes | `apps/web/src/mutations/contracts/*.mutation.ts` (`"use server"`, `ActionResult<T>`, `getAdminSession()` gate) |
| Validation | `apps/web/src/schemas/contract.schema.ts`, `deposit.schema.ts`, `payment.schema.ts`, `recipient.schema.ts` (zod, shared client+server) |
| UI | `apps/web/src/app/admin/dogovori/…`, `admin/depoziti/…`, `admin/poluchateli/…` + `components/admin/contracts/…` (Base UI + RHF + zodResolver, inline BG strings) |
| Auth | existing `requireAdminPage()` / `getAdminSession()`; role `admin` (room for a future `accountant` role via `APP_ROLES`) |
| PDF | new `apps/web/src/pdf/` — `@react-pdf/renderer` templates rendered inside server actions (no headless Chrome, works on Vercel) |
| Files (PDFs + payment proofs) | new **private S3 bucket** in Pulumi (`infra/src/storage.ts` pattern), server-action presigned upload/download; web already holds AWS creds (SQS enqueue precedent) |
| Audit | dedicated `contract_events` append-only table |

No i18n framework (hardcoded BG), no tRPC/REST — server actions only, matching the repo.

## 2. Data model (migration `0038_contracts_payments.sql`)

All money columns `numeric(12,2)` (not integer EUR like `calculator_offers` — payments need
cents). All tables `created_at`/`updated_at timestamptz`.

### 2.1 `clients`
The spec enters client data per contract, but §14.1 ("does this client have an active
deposit?") requires a client identity across contracts.

- `id serial PK`, `kind` `'individual' | 'company'`
- individual: `full_name`, `egn`, `address`, `phone`, `email`
- company: `company_name`, `eik`, `vat_number` (optional), `company_address`,
  `representative`, `phone`, `email`
- Uniqueness soft (search by EGN/ЕИК/name when creating a contract; dedupe assist, not enforced)
- GDPR note: EGN is sensitive — admin-only access already enforced; add to privacy register.

### 2.2 `payment_recipients` (§8)
- `id serial PK`, `slug` (`selectauto`, `auto_america`, `lean_customs`, partner slugs…)
- `kind`: `'selectauto' | 'international_partner' | 'customs_broker'`
- `name`, `country`, `address`, `vat_number`, `bank_name`, `bank_address`,
  `iban_or_account`, `swift_bic`, `currency`, `charges_instruction` (`OUR|SHA|…` free text),
  `payment_method_note` (e.g. „BLINK“), `active boolean`
- Seed rows: СЕЛЕКТАУТО ИМПОРТ ЕООД (ОББ, UBBSBGSF, BG38UBBS80021477259910, BLINK),
  Auto America B.V (ING, NL42INGB0674607880), Lean Customs BV (Rabobank,
  NL34RABO0369590007), CargoLoop (details TBD from client).

### 2.3 `contract_counters`
- `(series text, year int) PK`, `last_no int` — series `'contract' | 'deposit'`.
- Number minting: `INSERT … ON CONFLICT DO UPDATE SET last_no = last_no + 1 RETURNING`,
  atomic under concurrency → display number `2026-088`. Start values configurable so
  numbering continues from the paper series.

### 2.4 `contracts` (mediation)
- `id serial PK` (the internal identifier all documents link by — §2)
- `number text UNIQUE` (`2026-088`), `contract_date date` (editable by admin)
- `market` `'us_ca' | 'kr'` → `currency` `'USD' | 'EUR'` (derived, stored)
- `client_id FK` **plus a client snapshot jsonb** (contract must not change if client record
  is later edited — same immutability principle as documents)
- Car: `car_year`, `car_make`, `car_model`, `vin`, `purchase_market`, `auction_platform`
- Amounts: `amount_car`, `amount_transport`, `amount_customs_vat`, `amount_transport_eu_bg`,
  `amount_commission`; `total_amount` (stored, checked = sum)
- `payment_basis text` (default „Договор № {number}“)
- `deposit_contract_id FK nullable` + `deposit_deduction numeric(12,2)` (applied to stage 1)
- `status` `'draft' | 'active' | 'fully_paid' | 'cancelled'` (fully_paid derived when all 4
  stages paid — §11.8)
- `created_by`, `updated_by` (FK `users.id`)

### 2.5 `contract_payments` (exactly 4 per contract, created in the same transaction)
- `id serial PK`, `contract_id FK`, `stage` `'vehicle' | 'transport' | 'customs_vat' | 'final'`,
  `UNIQUE (contract_id, stage)`
- `due_amount` (stage 1 = amount_car − deposit_deduction; final = т.4 + т.5), `currency`
- `recipient_id FK nullable` (chosen at generation; pre-selectable), `basis text`
  (own основание, esp. customs stage), `due_date date nullable`
- `status` `'not_requested' | 'awaiting_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'`
- `paid_amount numeric(12,2) default 0`, `paid_at date`, `note text`
- remaining is computed (`due_amount − paid_amount`), not stored

### 2.6 `payment_documents` (generated notices — append-only, §2/§6/§9)
- `id serial PK`, `contract_id FK`, `payment_id FK`, `version int`
  (`UNIQUE (payment_id, version)`)
- `recipient_id FK` + **`snapshot jsonb`** — the complete rendered payload: issuer block,
  client block, car block, line items (incl. negative deposit line), amounts, recipient
  bank block, основание, rate
- USD logic: `amount_usd`, `usd_eur_rate numeric(10,6)`, `amount_eur` (all nullable; filled
  only for us_ca + SelectAuto)
- `pdf_s3_key text`, `generated_by FK users.id`, `created_at`
- Never updated, never deleted. Re-generate = insert version+1 after explicit confirm (§10).

### 2.7 `deposit_contracts` (§14)
- `id serial PK`, `number text UNIQUE` (own series), `deposit_date date`
- `client_id FK` + snapshot jsonb, `budget_amount`, `budget_currency`, `deposit_amount`
  (min 500 EUR per template), `vehicle_description text`
- `status` `'draft' | 'signed' | 'paid' | 'used' | 'returned' | 'cancelled'`
- `used_in_contract_id FK contracts.id nullable` — set exactly once (partial unique index
  guards single use)
- `pdf_s3_key` for the generated deposit contract document, versioned via
  `deposit_documents` (same shape as `payment_documents`, or fold both into one
  `generated_documents` table with `kind` — decision: **one table `generated_documents`**
  with `kind` `'payment_notice' | 'contract' | 'deposit_contract'` to also cover generating
  the mediation contract PDF itself)

### 2.8 `payment_attachments` (proof uploads, §4.3)
- `id`, `payment_id FK`, `s3_key`, `filename`, `content_type`, `size_bytes`,
  `uploaded_by`, `created_at`

### 2.9 `contract_events` (audit — §9)
- `id bigserial`, `entity` (`contract|payment|deposit|recipient`), `entity_id`,
  `action` (`created|updated|status_changed|document_generated|marked_paid|
  payment_reverted|attachment_added|…`), `actor_id FK users.id`, `data jsonb`
  (diff / old→new), `created_at`
- Written inside the same transaction as each mutation. Append-only.

## 3. PDF generation

**Choice: `@react-pdf/renderer` in server actions.** Rationale: runs on Vercel Node runtime
(no headless Chrome/lambda round-trip), React component templates fit the repo, deterministic
layout for tabular notices. The documents are forms/tables — well within react-pdf's
capabilities. Requirements:

- **Cyrillic font**: embed a font family with full Cyrillic (e.g. PT Sans / Noto Sans,
  regular + bold) under `apps/web/src/pdf/fonts/`; register with `Font.register`.
- **Assets**: signature + stamp image for contract/deposit templates (extract from the
  client's originals; the notices legally don't require stamp — the samples cite Закона за
  счетоводството on that, keep that footer line).
- Templates (one component each, shared layout primitives):
  1. `payment-notice-selectauto-usd.tsx` — columns Стойност/USD, Курс, Стойност/Евро; BLINK block
  2. `payment-notice-selectauto-eur.tsx` — Цена/Евро + лв. equivalent (×1.95583)
  3. `payment-notice-recipient.tsx` — generic international recipient (Auto America, Lean
     Customs, partners) driven entirely by `payment_recipients` data (§8: new partner ⇒ no new template)
  4. `deposit-contract.tsx` — full legal text of the deposit template
  5. `mediation-contract-us.tsx` / `mediation-contract-kr.tsx` — **needs the original .docx
     templates from the client** (we have the deposit sample; the two mediation templates
     referenced in §3.1 are not in hand yet)
- **Amount in words (BG)**: small util `lib/bg-amount-words.ts`
  („хиляда деветстотин двадесет и пет евро и 54 цента“) + unit tests.
- Flow: server action builds the snapshot → renders PDF to buffer → `PutObject` to S3
  (`contracts/{contractId}/…/v{n}.pdf`) → inserts `generated_documents` row → returns
  presigned GET (short TTL) for immediate download. Preview step (§6.3) renders the same
  snapshot as HTML in a dialog *before* committing.

## 4. Infrastructure additions (Pulumi)

- `infra/src/storage.ts`: new **private bucket** `selectauto-documents-{stack}` (Block
  Public Access, SSE, versioning on as belt-and-braces for immutability). No CloudFront —
  documents are private; access only via presigned URLs from admin server actions.
- IAM: extend the existing web-app credentials policy with `s3:PutObject/GetObject` scoped
  to that bucket (uploads of payment proofs also go through server-action presigned PUT —
  browser never sees AWS creds).
- No new lambdas/queues needed. Optional later: Vercel cron (pattern:
  `app/api/cron/favorite-auction-alerts`) to flip `awaiting_payment` → `overdue` when
  `due_date` passes.

## 5. Admin UI

Routes (BG slugs, matching the repo):

- **`/admin/dogovori`** — list: №, date, client, car (year/make/model + VIN), market badge
  (САЩ-Канада/Корея), total + currency, 4 stage chips (colored by status — the old-system
  green dropdowns become status chips + row link), overall status filter, search
  (№/VIN/client/ЕГН/ЕИК).
- **`/admin/dogovori/nov`** — creation wizard (single page, sections):
  1. Тип договор (radio: САЩ/Канада USD | Корея EUR)
  2. Клиент — search existing / create new; toggle физическо/юридическо with the field sets
     from §3.2; **deposit check**: on client select, query active deposits → offer
     „Приспадни Депозит № … (−500 EUR)“ checkbox (§14.1)
  3. Автомобил (година, марка, модел, VIN, пазар, търг/платформа)
  4. Финансови точки 1–5 with live total (digits + words preview)
  5. Запази → transactionally: mint number, insert contract + snapshot + 4 payments,
     link/mark deposit `used`, audit event.
- **`/admin/dogovori/[id]`** — detail: header (contract data, „Генерирай договор PDF“,
  edit for authorized users — edits never touch generated docs), then the **four payment
  stage cards** (§4): due, currency, recipient select (options per §5 rules — hidden, not
  disabled), основание, падеж, status badge, paid amount/date, remaining, notes,
  attachments, buttons:
  - „Генерирай известие за плащане“ → dialog: recipient pick (where allowed) → **rate
    input iff us_ca + SelectAuto** (validated positive decimal, EUR auto-computed,
    read-only) → preview (§6.3) → потвърди → PDF v(n), status → Очаква плащане
  - „Отбележи като платено“ → dialog: date (default today, editable), реално платена сума
    (partial ⇒ `partially_paid`), бележка, файл; reversible via „Върни статус“ (audited)
  - Versions list per stage (v1, v2… with date/user/download)
  - История tab: `contract_events` timeline.
- **`/admin/depoziti`** — list + create (client, budget, deposit amount ≥ 500 EUR) +
  detail with status transitions (Чернова→Подписан→Платен→Използван/Върнат/Анулиран),
  PDF generation, link to the mediation contract once used.
- **`/admin/poluchateli`** — recipients CRUD (admin-only), active toggle; generation is
  blocked with a clear message if the chosen recipient has incomplete bank data (§10).

Validation matrix (zod, enforced server-side too — §10/§16.4):
- stage∈{vehicle,transport} ⇒ recipient.kind ∈ {selectauto, international_partner}
- stage=customs_vat ⇒ recipient.slug ∈ {auto_america, lean_customs}
- stage=final ⇒ recipient forced selectauto
- us_ca + selectauto ⇒ rate required > 0 (≤6 dp); otherwise rate must be absent
- amounts read-only on the generation screen; missing recipient/bank data blocks generation
- regenerate ⇒ explicit confirmation dialog

## 6. Delivery phases (each = deployable slice)

1. **Foundations** — migration 0038 (all tables + seeds + counters), schema.ts, zod
   schemas, recipients CRUD (`/admin/poluchateli`), S3 bucket + IAM in Pulumi.
2. **Contracts core** — clients, contract creation wizard, auto 4 stages, list + detail
   (no PDFs yet), audit events.
3. **PDF engine + payment notices** — react-pdf setup (fonts, layout kit), the three
   notice templates, generation dialog with rate logic + preview, versioning, S3 store +
   download. *This is the highest-value slice for the business.*
4. **Payments workflow** — mark paid/partial, revert with history, attachments (presigned
   upload), remaining calc, overall „Сделката е напълно платена“, overdue cron.
5. **Deposits** — module, numbering, statuses, deduction into payment 1 + negative line on
   the notice, single-use guard.
6. **Contract documents** — mediation US + KR contract PDFs and deposit contract PDF from
   the client's originals (blocked on receiving the .docx templates), amount-in-words.
7. **Hardening** — permissions review (introduce `accountant` role if needed), dashboard
   widget (unpaid/overdue totals), e2e pass over acceptance criteria §13.

## 7. Open questions for the client (block only phase 6 + seeds)

1. Original **.docx templates** for the US/CA and Korea mediation contracts (we only have
   the deposit template + notice samples) and the signature/stamp scans.
2. **Numbering**: continue the current paper series (what's the next free № for contracts
   and for deposits in 2026)? Reset each year?
3. **CargoLoop / International Partner** bank details for seeding, and the full partner list.
4. Korea sample discrepancy (15 480 vs 14 480) — confirm it was a deposit deduction.
5. Should notices for SelectAuto EUR keep showing the **лв. equivalent** now that BG is in
   the eurozone (sample from 06.2026 still shows it)? If yes: fixed 1.95583.
6. Падеж (due date) — is it actually used day-to-day (drives the overdue automation)?
7. Who besides the two admins gets access — need for a restricted role (view-only /
   accountant) now or later?
