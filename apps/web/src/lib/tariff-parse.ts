/**
 * Dependency-free tariff parser for the /admin/tarifi paste flow.
 *
 * The admin selects the price range in Excel/Google Sheets and pastes it — which
 * arrives as TAB-separated text (TSV). We parse plain text: no xlsx library, no
 * binary-format quirks, immune to which program generated the sheet (the exact
 * fragility that made xlsx parsing untenable — CargoLoop's two files were saved by
 * different tools with incompatible internal XML).
 *
 *  - Inland: rows with an "Auction Location" header + 6 terminal price columns.
 *    The preferred terminal is the CHEAPEST non-empty one (reproduces the source
 *    sheet's colour-coded routing — verified: the coloured cell is the min price).
 *  - Container: a config × terminal price-per-car grid.
 *
 * Fails CLOSED with a descriptive BG error if the shape is wrong — nothing is
 * written and the calculator keeps its last-good (or seed) data.
 */

import type { UsTariffData } from "@/lib/us-transport";
import { CONTAINER_CONFIG_BY_TYPE, type UsInlandTariff } from "@/data/us-transport-tariffs";

/**
 * Map a header cell to a canonical terminal name by its city keyword, or null.
 * The 6 canonical terminals: Savannah GA, Elizabeth NJ, Houston TX, Los Angeles
 * CA, Indianapolis IN, Montreal QC.
 */
function canonTerminal(h: string): string | null {
  const s = h.toLowerCase().replace(/[^a-z]/g, "");
  if (s.includes("savannah")) return "Savannah, GA";
  if (s.includes("elizabeth")) return "Elizabeth, NJ";
  if (s.includes("houston")) return "Houston, TX";
  if (s.includes("losangeles")) return "Los Angeles, CA";
  if (s.includes("indianapolis")) return "Indianapolis, IN";
  if (s.includes("montreal")) return "Montreal, QC";
  return null;
}

const norm = (s: string | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

function toNum(s: string | undefined): number {
  const n = parseFloat((s ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Split pasted TSV into a 2-D grid of trimmed cells (tab-delimited, \r?\n rows). */
function grid(tsv: string): string[][] {
  return tsv
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.split("\t"));
}

/** Parse the inland TSV → resolved rows (preferred = cheapest terminal). */
function parseInland(tsv: string): UsInlandTariff[] {
  const rows = grid(tsv);

  // Find the header row (contains an "Auction Location" / "Location" cell).
  let headerIdx = -1;
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    if (rows[r].some((c) => ["auction location", "location"].includes(norm(c).toLowerCase()))) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error("Не е намерен ред-заглавие с колона „Auction Location“. Поставете таблицата заедно със заглавния ред.");
  }

  const header = rows[headerIdx];
  let locationCol = -1;
  let auctionCol = -1;
  let cityCol = -1;
  let stateCol = -1;
  let zipCol = -1;
  const terminalCols: { terminal: string; col: number }[] = [];
  header.forEach((cell, c) => {
    const t = norm(cell);
    const low = t.toLowerCase();
    if (low === "auction location" || low === "location") locationCol = c;
    else if (low === "auction") auctionCol = c;
    else if (low === "city") cityCol = c;
    else if (low === "state") stateCol = c;
    else if (low === "zip" || low === "zip code") zipCol = c;
    else {
      const term = canonTerminal(t);
      if (term) terminalCols.push({ terminal: term, col: c });
    }
  });
  if (locationCol < 0) throw new Error("Липсва колона „Auction Location“.");
  if (terminalCols.length === 0) {
    throw new Error("Не са намерени колони с терминали (Savannah, Elizabeth, Houston, Los Angeles, Indianapolis, Montreal).");
  }

  const out: UsInlandTariff[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const location = norm(row[locationCol]);
    if (!location) continue;
    let best: { terminal: string; price: number } | null = null;
    for (const tc of terminalCols) {
      const price = toNum(row[tc.col]);
      if (Number.isFinite(price) && price > 0 && (!best || price < best.price)) {
        best = { terminal: tc.terminal, price };
      }
    }
    if (!best) continue;
    out.push({
      location,
      auction: auctionCol >= 0 ? norm(row[auctionCol]) : "",
      city: cityCol >= 0 ? norm(row[cityCol]) : "",
      state: stateCol >= 0 ? norm(row[stateCol]) : "",
      zip: zipCol >= 0 ? norm(row[zipCol]) : "",
      terminal: best.terminal,
      inland: Math.round(best.price),
    });
  }
  if (out.length < 50) {
    throw new Error(`Транспортната таблица съдържа само ${out.length} валидни реда — очаквани са стотици. Проверете поставените данни.`);
  }
  return out;
}

/** Parse the container TSV → { config → terminal → price-per-car }. */
function parseContainer(tsv: string): UsTariffData["container"] {
  const rows = grid(tsv);

  // Header row = the first row with ≥2 terminal names.
  let headerIdx = -1;
  for (let r = 0; r < Math.min(6, rows.length); r++) {
    if (rows[r].filter((c) => canonTerminal(norm(c))).length >= 2) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx < 0) throw new Error("Не е намерен ред-заглавие с терминали в контейнерната таблица.");

  const terminalCols: { terminal: string; col: number }[] = [];
  rows[headerIdx].forEach((cell, c) => {
    const term = canonTerminal(norm(cell));
    if (term) terminalCols.push({ terminal: term, col: c });
  });

  const container: UsTariffData["container"] = {};
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const config = norm(rows[r][0]);
    if (!config || canonTerminal(config)) continue;
    const byTerminal: Partial<Record<string, number>> = {};
    for (const tc of terminalCols) {
      const price = toNum(rows[r][tc.col]);
      if (Number.isFinite(price) && price > 0) byTerminal[tc.terminal] = Math.round(price);
    }
    if (Object.keys(byTerminal).length > 0) container[config] = byTerminal;
  }

  for (const cfg of Object.values(CONTAINER_CONFIG_BY_TYPE)) {
    if (!container[cfg]) throw new Error(`Контейнерната таблица няма конфигурация „${cfg}“ (нужна за седан/джип).`);
  }
  return container;
}

export type ParsedTariffs = { data: UsTariffData; inlandRows: number; containerRows: number };

/** Parse + validate both pasted tables. Throws a BG error message on any problem. */
export function parseTariffText(input: { inlandTsv: string; containerTsv: string }): ParsedTariffs {
  const inland = parseInland(input.inlandTsv);
  const container = parseContainer(input.containerTsv);

  // Every terminal used by the inland rows must have a container price for both
  // sedan (4-car) and suv (3-car) — else resolution would return notFound.
  const usedTerminals = new Set(inland.map((r) => r.terminal));
  for (const cfg of Object.values(CONTAINER_CONFIG_BY_TYPE)) {
    for (const term of usedTerminals) {
      if (container[cfg]?.[term] === undefined) {
        throw new Error(`Няма контейнерна цена за „${cfg}“ до терминал „${term}“, използван в транспортната таблица.`);
      }
    }
  }

  const containerRows = Object.values(container).reduce((n, m) => n + Object.keys(m).length, 0);
  return { data: { inland, container }, inlandRows: inland.length, containerRows };
}
