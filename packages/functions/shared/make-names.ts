/**
 * Display names for the makes and models the reference sync stores. Since it reads `/manufacturers/all` (19.11.2026)
 * it also stores AuctionsAPI's 150 motorcycle-only makes, and 127 of their names are lower case or codes („kawasaki",
 * „can-am/ brp", „bsa"). The car makes' and car models' names are proper and are never changed here („i3" stays).
 * AuctionsAPI's own name stays in `raw_json`.
 */

/** Motorcycle makes with listings (18.11.2026), as the brands write themselves. */
const MAKE_NAMES: Readonly<Record<number, string>> = {
  500076: "Kawasaki",
  500108: "Polaris",
  500033: "Can-Am",
  500049: "Ducati",
  500038: "CFMOTO",
  500014: "Aprilia",
  500127: "Victory",
  500126: "Vespa",
  500110: "Royal Enfield",
  500067: "Husqvarna",
  500016: "Arctic Cat",
  500095: "Moto Guzzi",
  500077: "KYMCO",
  500069: "Indian",
  500119: "SYM",
  500031: "Buell",
  500019: "Benelli",
  500023: "Big Dog",
  500068: "Hyosung",
  500055: "GasGas",
  500020: "Beta",
  500035: "Carver",
  500022: "Big Bear Choppers",
  500082: "Linhai",
  500096: "Moto Morini",
  500030: "BSA",
  500052: "Energica",
  500117: "Super Soco",
  500063: "Highland",
  500071: "Janus",
  500111: "Ryvid",
  500017: "ATK",
  500120: "TGB",
  500061: "Hercules",
  500034: "Cannondale",
  500047: "Derbi",
  500066: "Husaberg",
  500103: "MZ",
  // No listings on 18.11.2026, but the rule below would misspell them.
  500102: "MV Agusta",
  500128: "Vincent HRD",
  500137: "Zündapp",
};

const isAllLower = (s: string): boolean => /[a-z]/.test(s) && s === s.toLowerCase();

/** „moto guzzi" → „Moto Guzzi", „big-dog" → „Big-Dog". */
const titleCase = (s: string): string => s.replace(/(^|[\s\-/])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());

/**
 * A make's display name: the brand's own spelling for a listed motorcycle make, else AuctionsAPI's name when a
 * motorcycle-only make's name came all lower case: a one-word name of up to three letters in capitals (an acronym:
 * „ajp" → „AJP", „ccm" → „CCM"), any other title-cased. `raw` is the AuctionsAPI manufacturer (`cars`: false marks a
 * motorcycle-only make).
 */
export function makeDisplayName(id: number, name: string | null, raw: Record<string, unknown>): string | null {
  if (MAKE_NAMES[id]) return MAKE_NAMES[id];
  if (!name || raw.cars !== false || !isAllLower(name)) return name;
  const clean = name.trim();
  return /^[a-z&]{1,3}$/.test(clean) || clean.includes("&") ? clean.toUpperCase() : titleCase(clean);
}

/**
 * A motorcycle model's display name when AuctionsAPI's came all lower case: words capitalised, and a word with a digit
 * or of one or two letters in capitals („africa twin" → „Africa Twin", „cbr600rr" → „CBR600RR", „450 mx" → „450 MX").
 * Anything else, and every car model, keeps its name.
 */
export function modelDisplayName(name: string | null, isMotorcycle: boolean): string | null {
  if (!name || !isMotorcycle || !isAllLower(name)) return name;
  return name
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) => (/\d/.test(part) || part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join("-"),
    )
    .join(" ");
}
