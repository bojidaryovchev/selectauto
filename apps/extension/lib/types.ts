/** The auction sources the extension can detect. `iaai_ca` is IAAI Canada, which
 *  the site stores under the same `iaai_com` domain but we keep distinct here so
 *  detection/matching stays faithful to the page host. */
export type Source = "copart" | "iaai" | "iaai_ca" | "encar";

/** What `detectCarPage()` extracts from the current lot page. `externalId` is the
 *  on-page lot id (Copart lot #, IAAI stock #, Encar car-id) — it equals the
 *  backend's `auction_lots.lot_number`. */
export interface DetectedCar {
  source: Source;
  externalId: string;
  url: string;
}

/** Message content script → background. */
export interface LotCheckRequest {
  type: "LOT_CHECK";
  source: Source;
  lot: string;
  vin?: string;
}

export type LotStatus = "active" | "past" | "unlisted";

/** Response shape from GET /api/lot-check (and the background relay). `ok:false`
 *  means the lookup itself failed (network/server); `ok:true, exists:false`
 *  means the lot simply isn't in the DB. */
export interface LotCheckResponse {
  ok: boolean;
  exists?: boolean;
  status?: LotStatus;
  url?: string;
  title?: string;
  price?: string | null;
  mileage?: string | null;
  image?: string | null;
  source?: string;
  phone?: string;
  error?: string;
}
