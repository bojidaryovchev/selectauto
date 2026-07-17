import { z } from "zod";

/**
 * Validation for the /api/lot-check endpoint — the read-only lookup the browser
 * extension (apps/extension) calls while an agent is on a Copart / IAAI / Encar
 * lot page, to tell whether that exact lot is already a listing on selectauto.bg.
 *
 * The extension sends the `source` it detected from the page host and the lot's
 * on-page id (`lot`), which equals `auction_lots.lot_number` for every domain
 * (verified against live Neon: the page id is the Copart lot #, IAAI stock #,
 * or Encar car-id — NOT AuctionsAPI's internal `external_lot_id`). `vin` is an
 * optional secondary key for the rare non-numeric lot.
 *
 * Pure (no server-only imports) so the same schema can be shared with the
 * extension's request builder without pulling the DB layer into the bundle.
 */
export const LOT_CHECK_SOURCES = ["copart", "iaai", "iaai_ca", "encar"] as const;
export type LotCheckSource = (typeof LOT_CHECK_SOURCES)[number];

export const lotCheckSchema = z.object({
  source: z.enum(LOT_CHECK_SOURCES),
  // Copart lot # / IAAI stock # / Encar car-id — digits for all three today, but
  // IAAI has a few alphanumeric stock numbers, so allow [0-9A-Za-z-].
  lot: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[0-9A-Za-z-]+$/, { message: "Invalid lot id." }),
  // Optional VIN fallback (ISO 3779: 17 chars, no I/O/Q). Empty → omitted.
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/)
    .optional()
    .catch(undefined),
});

export type LotCheckQuery = z.infer<typeof lotCheckSchema>;

/** source (from the page host) → auction_lots.domain_name (the stored key). */
export const SOURCE_TO_DOMAIN: Record<LotCheckSource, string> = {
  copart: "copart_com",
  iaai: "iaai_com",
  iaai_ca: "iaai_com",
  encar: "encar_com",
};
