import type { UsInlandTariff } from "@/data/us-transport-tariffs";

/**
 * Auction yards the owner priced by hand because they are ABSENT from the
 * CargoLoop workbook (quotes sent 22.07.2026, USD, sedan / SUV).
 *
 * These carry `flatUsdByType`: the figure is the ALL-IN transport to Holland for
 * that vehicle type, so `resolveUsTransport` returns it as the whole transport
 * cost and adds NO container price on top (see us-transport.ts).
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
export const OWNER_QUOTED_YARDS: UsInlandTariff[] = [
  // "LAS VEGAS -2150 - 2235 / SEDAN - SUV DZHIP"
  { location: "Las Vegas 89122", auction: "IAAI", city: "Las Vegas", state: "NV", zip: "89122", terminal: "Los Angeles, CA", inland: 2150, flatUsdByType: { sedan: 2150, suv: 2235 } },
  // "Кълъмбъс, Охайо 43223 - 1980 - 2035"
  { location: "Columbus 43223", auction: "IAAI", city: "Columbus", state: "OH", zip: "43223", terminal: "Indianapolis, IN", inland: 1980, flatUsdByType: { sedan: 1980, suv: 2035 } },
  // "Тампа, Флорида 33619 - 1535 - 1630"
  { location: "Tampa 33619", auction: "IAAI", city: "Tampa", state: "FL", zip: "33619", terminal: "Savannah, GA", inland: 1535, flatUsdByType: { sedan: 1535, suv: 1630 } },
  // "Scott, Луизиана 70583 - 1635 - 1845" (IAAI's Lafayette branch)
  { location: "Scott (LA) 70583", auction: "IAAI", city: "Scott", state: "LA", zip: "70583", terminal: "Houston, TX", inland: 1635, flatUsdByType: { sedan: 1635, suv: 1845 } },
  // "Mitchell, Илинойс 62040 - 1735 - 1870" — the lots all carry city "granite
  // city" (Mitchell is an unincorporated community inside the 62040 ZIP; a
  // DB-wide search for city "mitchell" returns zero rows), so the row is keyed
  // on Granite City to make the city+state fallback work.
  { location: "Granite City (IL) 62040", auction: "IAAI", city: "Granite City", state: "IL", zip: "62040", terminal: "Indianapolis, IN", inland: 1735, flatUsdByType: { sedan: 1735, suv: 1870 } },
  // "Детройт, Мичиган 48234 - 1835 - 1970"
  { location: "Detroit 48234", auction: "IAAI", city: "Detroit", state: "MI", zip: "48234", terminal: "Indianapolis, IN", inland: 1835, flatUsdByType: { sedan: 1835, suv: 1970 } },
];
