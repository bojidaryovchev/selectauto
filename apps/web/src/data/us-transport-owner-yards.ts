import type { UsInlandTariff } from "@/data/us-transport-tariffs";

/**
 * Auction yards the owner priced by hand because they are ABSENT from the
 * CargoLoop workbook (quotes sent 22.07.2026 and 07.08.2026, USD).
 *
 * Most carry `flatUsdByType`: the figure is the ALL-IN transport to Holland for
 * that vehicle type, so `resolveUsTransport` returns it as the whole transport
 * cost and adds NO container price on top (see us-transport.ts). A row WITHOUT
 * that field is an ordinary yard price and still gets the container added — the
 * distinction is exactly how the owner quoted it, so don't "normalise" them.
 *
 * Kept in this hand-maintained file — NOT in the generated `us-transport-tariffs.ts`
 * — so regenerating that file from the workbook cannot silently delete them.
 * They are appended AFTER the generated rows in `US_TARIFF_SEED` and after the
 * DB rows in `getUsTariffs`; index building is first-write-wins, so if a future
 * workbook/upload ever prices one of these yards properly, the real row wins and
 * these become inert.
 *
 * Verified against production (2026-07-22): every lot at these six zips is IAAI
 * (0 Copart), 8 708 live listings in total. Copart operates in the same cities
 * but at different, already-priced zips (Las Vegas 89115, Columbus 43207,
 * Detroit 48183, Tampa 33592/33578), so those cars are unaffected.
 *
 * `terminal` is taken from the nearest already-priced yard and is used only for
 * display; it does not affect the price. `inland` mirrors the sedan figure so the
 * row is still sane if `flatUsdByType` is ever dropped, though the resolver never
 * reads it while the flat figures are present.
 */
/**
 * Owner's rule (07.08.2026): "Нека джипа да е 235 по скъп" — on these hand-quoted
 * flat yards the SUV/jeep costs exactly $235 more than the sedan. This SUPERSEDES
 * the per-yard SUV figures he first sent on 22.07.2026 (which implied only
 * $55–210, "разликата е прекалено малка").
 */
const SUV_PREMIUM_USD = 235;

/** Sedan quote → the {sedan, suv} pair, applying the owner's jeep premium. */
function flat(sedanUsd: number): { sedan: number; suv: number } {
  return { sedan: sedanUsd, suv: sedanUsd + SUV_PREMIUM_USD };
}

export const OWNER_QUOTED_YARDS: UsInlandTariff[] = [
  // ── Quoted 22.07.2026 (sedan figures; jeep now derived, see SUV_PREMIUM_USD) ──
  // "LAS VEGAS -2150 - 2235 / SEDAN - SUV DZHIP"
  { location: "Las Vegas 89122", auction: "IAAI", city: "Las Vegas", state: "NV", zip: "89122", terminal: "Los Angeles, CA", inland: 2150, flatUsdByType: flat(2150) },
  // "Кълъмбъс, Охайо 43223 - 1980 - 2035"
  { location: "Columbus 43223", auction: "IAAI", city: "Columbus", state: "OH", zip: "43223", terminal: "Indianapolis, IN", inland: 1980, flatUsdByType: flat(1980) },
  // "Тампа, Флорида 33619 - 1535 - 1630"
  { location: "Tampa 33619", auction: "IAAI", city: "Tampa", state: "FL", zip: "33619", terminal: "Savannah, GA", inland: 1535, flatUsdByType: flat(1535) },
  // "Scott, Луизиана 70583 - 1635 - 1845" (IAAI's Lafayette branch)
  { location: "Scott (LA) 70583", auction: "IAAI", city: "Scott", state: "LA", zip: "70583", terminal: "Houston, TX", inland: 1635, flatUsdByType: flat(1635) },
  // "Mitchell, Илинойс 62040 - 1735 - 1870" — the lots all carry city "granite
  // city" (Mitchell is an unincorporated community inside the 62040 ZIP; a
  // DB-wide search for city "mitchell" returns zero rows), so the row is keyed
  // on Granite City to make the city+state fallback work.
  { location: "Granite City (IL) 62040", auction: "IAAI", city: "Granite City", state: "IL", zip: "62040", terminal: "Indianapolis, IN", inland: 1735, flatUsdByType: flat(1735) },
  // "Детройт, Мичиган 48234 - 1835 - 1970"
  { location: "Detroit 48234", auction: "IAAI", city: "Detroit", state: "MI", zip: "48234", terminal: "Indianapolis, IN", inland: 1835, flatUsdByType: flat(1835) },

  // ── Quoted 07.08.2026 ──
  // "1- 1560 вътрешен и морски" — Copart's MD - Laurel branch, the only
  // high-volume US yard with no workbook row at all. Inland + sea in one figure,
  // so it is a flat quote like the six above.
  { location: "Laurel (MD) 20707", auction: "Copart", city: "Laurel", state: "MD", zip: "20707", terminal: "Elizabeth, NJ", inland: 1560, flatUsdByType: flat(1560) },
  // "2- качи цената с 125 долара" — IAAI Uxbridge MA, asked about as "we route it
  // to Taunton 02718 ($650), but it is ~65 km away". He raised the YARD price by
  // $125, not the all-in cost, so this stays on the normal inland + container
  // model (650 + 125 = 775, Elizabeth NJ) rather than becoming a flat quote —
  // its jeep premium therefore comes from the container grid, like every other
  // workbook yard, not from SUV_PREMIUM_USD.
  { location: "Uxbridge (MA) 01569", auction: "IAAI", city: "Uxbridge", state: "MA", zip: "01569", terminal: "Elizabeth, NJ", inland: 775 },
];
