/**
 * VIN normalisation — the single definition of what "the same vehicle" means.
 *
 * This matters more than it looks. `cars.vin` is a PLAIN, NON-UNIQUE, nullable
 * column and ingestion only trims the value (never upper-cases it), while
 * archived payloads arrive lower-cased. So one physical vehicle owns SEVERAL
 * `cars` rows — a relist, or the same car run at Copart and then IAAI — each
 * with its own `/avtomobil/{id}` URL.
 *
 * A paid de-index keyed on a car id would therefore hide ONE url and leave the
 * siblings indexed, which is exactly the failure a paying customer finds by
 * googling their own VIN. Everything is keyed on `normalizeVin` instead, and the
 * DB enforces the same rule with a CHECK on `car_deindex_requests.vin_normalized`
 * plus the matching functional index `cars_vin_normalized_idx`
 * (`upper(btrim(vin))`, migration 0044).
 *
 * Keep this in step with that index — if the expression here and the expression
 * in the index ever diverge, lookups silently stop matching.
 */

/** `"  kNagm4a77d5392566 "` → `"KNAGM4A77D5392566"`. Empty/blank → null. */
export function normalizeVin(vin: string | null | undefined): string | null {
  const trimmed = (vin ?? "").trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A VIN we are willing to act on. Deliberately permissive on length — Korean and
 * older vehicles do not always carry a 17-character VIN — but it must be long
 * enough not to match half the database by accident. Mirrors the DB CHECK.
 */
export function isUsableVin(vin: string | null): vin is string {
  return vin !== null && vin.length >= 5 && /^[A-Z0-9]+$/.test(vin);
}
