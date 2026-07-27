-- 0040_partner_bank_details.sql
-- Bank details for the two remaining international partners, supplied by the
-- owner (07.2026). Both were seeded name-only and INACTIVE by migration 0039;
-- filling the details activates them, so they now appear as a recipient option
-- on the „Кола" / „Транспорт" stages (spec §5.1/§7.2).
--
--   CARGOLOOP (САЩ)  — KeyBank, USD ONLY; the wire routing number goes in
--                      routing_code (US wires quote it alongside SWIFT).
--   SSANCAR (Корея)  — Shinhan Bank, Seoul.
--
-- Idempotent: only fills rows that are still blank, so re-running can't
-- overwrite details an admin has since corrected in /admin/poluchateli.

UPDATE payment_recipients SET
  name                = 'CargoLoop, LLC',
  country             = 'USA',
  address             = '2817 Tremont Rd, Savannah, GA 31405, USA',
  bank_name           = 'KeyBank',
  bank_address        = '501 E Carmel Dr, Carmel, IN 46032, USA',
  iban                = '149371021630',
  swift_bic           = 'KEYBUS33',
  routing_code        = '041001039',
  currency            = 'USD',
  charges_instruction = 'За сметка на изпращача',
  active              = TRUE,
  updated_at          = now()
WHERE slug = 'cargoloop' AND iban IS NULL;

UPDATE payment_recipients SET
  name                = 'SSANCAR CO LTD',
  country             = 'South Korea',
  address             = '65 Seonghyeon-ro, Ilsandong-gu, Goyang-si, Gyeonggi-do, South Korea',
  bank_name           = 'Shinhan Bank',
  bank_address        = '20 Sejong-Daero9-Gil, Jung-Gu, Seoul, South Korea',
  iban                = '180-008-400167',
  swift_bic           = 'SHBKKRSE',
  currency            = 'EUR',
  charges_instruction = 'За сметка на изпращача',
  active              = TRUE,
  updated_at          = now()
WHERE slug = 'ssancar' AND iban IS NULL;
