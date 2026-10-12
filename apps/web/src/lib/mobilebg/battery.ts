/**
 * The battery figures mobile.bg demands for electric cars and plug-in hybrids.
 *
 * Its import API answers „Wrong fields: battery_km, battery_kwh" for any advert
 * whose `engine_type` is „Електрически" or „Plug-in хибрид" and lacks them, though
 * the published docs never mention either field. Found when four EV publishes
 * failed that way (06-12.10.2026) and confirmed with payloads that cannot create
 * an advert: plain „Хибриден" and every other engine type do not need them.
 *
 * Neither figure exists in our data: Copart and IAAI lots carry no battery facts
 * at all, and ENCAR mentions a capacity only now and then, in a seller's free
 * text. So both come from the admin, like the production month.
 *
 * What the API accepts (probed 12.10.2026):
 *  - `battery_km`: whole kilometres, digits only, 1-9999;
 *  - `battery_kwh`: a positive number with at most 2 decimals and a DOT
 *    („75.5"; „75,5" is rejected).
 * The bounds below are tighter on purpose, to catch slips such as the two values
 * typed into each other's field. Kept free of server-only imports because the
 * publisher's inputs use it as the admin types.
 */

/** mobile.bg engine types that require both battery fields. */
export const BATTERY_ENGINE_TYPES: ReadonlySet<string> = new Set(["Електрически", "Plug-in хибрид"]);

/** Plausible WLTP range on one charge: a small plug-in hybrid to the longest-range EVs. */
export const BATTERY_KM_MIN = 10;
export const BATTERY_KM_MAX = 1500;

/** Plausible usable capacity: an early plug-in hybrid to the largest electric pickups. */
export const BATTERY_KWH_MIN = 4;
export const BATTERY_KWH_MAX = 300;

export type ParsedNumber =
  | { kind: "empty" }
  | { kind: "ok"; value: number }
  | { kind: "invalid"; message: string };

export function isValidBatteryKm(km: number): boolean {
  return Number.isInteger(km) && km >= BATTERY_KM_MIN && km <= BATTERY_KM_MAX;
}

export function isValidBatteryKwh(kwh: number): boolean {
  return (
    Number.isFinite(kwh) &&
    kwh >= BATTERY_KWH_MIN &&
    kwh <= BATTERY_KWH_MAX &&
    // At most two decimals, with a tolerance for binary floating point (75.55 * 100).
    Math.abs(Math.round(kwh * 100) - kwh * 100) < 1e-6
  );
}

/** 75.5 → "75.5", 77 → "77": the dot form the API accepts. */
export function formatBatteryKwh(kwh: number): string {
  return String(Math.round(kwh * 100) / 100);
}

/** „533", „533 км", „533km" → 533. */
export function parseBatteryKm(input: string): ParsedNumber {
  const text = input.replace(/[\s  ]/g, "").replace(/км|km/gi, "");
  if (!text) return { kind: "empty" };
  if (!/^\d+$/.test(text)) {
    return { kind: "invalid", message: `„${input.trim()}“ не е цяло число километри. Въведете напр. 533.` };
  }
  const km = Number(text);
  if (!isValidBatteryKm(km)) {
    return {
      kind: "invalid",
      message: `${km} км е извън ${BATTERY_KM_MIN}-${BATTERY_KM_MAX} км и изглежда като грешка при въвеждане.`,
    };
  }
  return { kind: "ok", value: km };
}

/** „75", „75,5", „75.5 kWh" → 75 / 75.5. A comma is the Bulgarian decimal mark. */
export function parseBatteryKwh(input: string): ParsedNumber {
  const text = input.replace(/[\s  ]/g, "").replace(/kwh|квтч|квт\.?ч\.?/gi, "");
  if (!text) return { kind: "empty" };
  if (!/^\d+([.,]\d{1,2})?$/.test(text)) {
    return {
      kind: "invalid",
      message: `„${input.trim()}“ не е капацитет в kWh. Въведете напр. 75 или 75,5 (до два знака след запетаята).`,
    };
  }
  const kwh = Number(text.replace(",", "."));
  if (!isValidBatteryKwh(kwh)) {
    return {
      kind: "invalid",
      message: `${String(kwh).replace(".", ",")} kWh е извън ${BATTERY_KWH_MIN}-${BATTERY_KWH_MAX} kWh и изглежда като грешка при въвеждане.`,
    };
  }
  return { kind: "ok", value: kwh };
}
