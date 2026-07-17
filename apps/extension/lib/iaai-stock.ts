/**
 * IAAI's vehicle-detail URL carries an internal ITEM id, e.g.
 * `/VehicleDetail/46127174~US`, which is NOT the stock number. Our DB keys IAAI
 * lots on the STOCK number (auction_lots.lot_number, e.g. 45628708) — verified
 * against live data: raw_json.external_id holds the URL item-id ("46127174~US"),
 * raw_json.lot holds the stock. The stock only appears in the rendered page, so
 * we read it from the DOM. IAAI is a client-rendered SPA, so poll until it shows.
 *
 * (Copart and Encar are unaffected — their URL id IS the DB lot_number.)
 */

/** Extract the IAAI Stock # from the page text ("Stock #: 45628708"). Optional
 *  trailing letter covers the rare alphanumeric stock (e.g. 12655268X). */
function readIaaiStock(): string | null {
  const text = document.body?.textContent ?? "";
  const m = text.match(/stock\s*#?\s*:?\s*([0-9]{5,}[A-Z]?)\b/i);
  return m?.[1] ?? null;
}

/** Poll for the Stock # until the SPA renders it (or we time out / navigate away). */
export async function waitForIaaiStock(
  isValid: () => boolean,
  timeoutMs = 9000,
  stepMs = 300,
): Promise<string | null> {
  const start = Date.now();
  for (;;) {
    if (!isValid()) return null;
    const stock = readIaaiStock();
    if (stock) return stock;
    if (Date.now() - start >= timeoutMs) return null;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}
