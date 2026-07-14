import { KRW_PER_USD } from "@/constants";
import {
  accidentSummaryLabel,
  historyFlagLabel,
  inspectMechanicLabel,
  inspectStatusLabel,
  inspectStatusTone,
  krYesNo,
  panelNameLabel,
  panelStatusLabel,
} from "@/lib/car-labels";
import { groupKoreaOptions } from "@/lib/korea-options";
import type {
  CarFactoryOptions,
  CarHistoryEntry,
  CarInsurance,
  CarInspection,
} from "@/types/car-detail.type";

/**
 * Parsers for the ENCAR (Korea) `raw_json.details.*` tree into the KR-market blocks
 * of the `CarDetail` view-model. Kept separate from the shared `car-detail-mapper`
 * because this subtree is large and ENCAR-only (US/Copart/IAAI lots leave `details`
 * null). Every access is defensively guarded — the tree is untyped and unevenly
 * filled per lot (and entirely absent on ARCHIVED ENCAR lots, which are stripped to
 * price-only), so each builder returns `undefined`/`[]` when its data is missing and
 * the page renders nothing.
 *
 * MONEY: `details.*` amounts (insurance costs, new-car price) are RAW Korean won —
 * the API only converts the HEADLINE price to USD — so they're divided by
 * `KRW_PER_USD` and shown as an approximate "~N $" (see the constant's note).
 */

/** Nested accessor: get(obj, "a.b.c"). */
function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** Trimmed non-empty string, else undefined. */
function s(v: unknown): string | undefined {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t.length === 0 ? undefined : t;
}

/** Finite number (any sign — costs are always ≥ 0 upstream), else undefined. */
function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Non-negative integer count (defaults junk to 0). */
function count(v: unknown): number {
  const n = num(v);
  return n != null && n > 0 ? Math.round(n) : 0;
}

/** Raw KRW → approximate USD string ("~1 375 $"), or undefined when 0/absent. */
export function usdFromKrw(krw: unknown): string | undefined {
  const n = num(krw);
  if (n == null || n <= 0) return undefined;
  const usd = Math.round(n / KRW_PER_USD);
  if (usd <= 0) return undefined;
  return `~${usd.toLocaleString("bg-BG").replace(/ /g, " ")} $`;
}

/** details.history[] → the vehicle-history timeline entries. */
export function buildEncarHistory(details: unknown): CarHistoryEntry[] {
  const hist = get(details, "history");
  if (!Array.isArray(hist)) return [];
  const out: CarHistoryEntry[] = [];
  for (const entry of hist) {
    const date = s(get(entry, "date"));
    const content = get(entry, "content");
    const rows = Array.isArray(content) ? content : [];
    // Each history entry can carry multiple content rows; surface each as its own
    // timeline item so distinct events on the same date aren't collapsed.
    for (const row of rows) {
      const title = s(get(row, "title"));
      const flagRaw = s(get(row, "flag"));
      const sub = s(get(row, "sub"));
      if (!title && !flagRaw && !sub) continue;
      out.push({
        date,
        title,
        flag: flagRaw ? historyFlagLabel(flagRaw) : undefined,
        sub,
      });
    }
  }
  return out;
}

/** details.insurance_v2 → the insurance/ownership summary. */
export function buildEncarInsurance(details: unknown): CarInsurance | undefined {
  const ins = get(details, "insurance_v2");
  if (ins == null || typeof ins !== "object") return undefined;

  const ownerDates = get(ins, "ownerChanges");
  const ownerChangeDates = Array.isArray(ownerDates)
    ? (ownerDates.map((d) => s(d)).filter(Boolean) as string[])
    : [];

  const accidentsRaw = get(ins, "accidents");
  const accidents = Array.isArray(accidentsRaw)
    ? accidentsRaw
        .map((a) => ({ date: s(get(a, "date")), cost: usdFromKrw(get(a, "insuranceBenefit")) }))
        .filter((a) => a.date || a.cost)
    : [];

  return {
    ownerChanges: count(get(ins, "ownerChangeCnt")),
    ownerChangeDates,
    accidentCount: count(get(ins, "accidentCnt")),
    myAccidentCount: count(get(ins, "myAccidentCnt")),
    otherAccidentCount: count(get(ins, "otherAccidentCnt")),
    totalLossCount: count(get(ins, "totalLossCnt")),
    floodCount: count(get(ins, "floodTotalLossCnt")),
    theftCount: count(get(ins, "robberCnt")),
    myAccidentCost: usdFromKrw(get(ins, "myAccidentCost")),
    otherAccidentCost: usdFromKrw(get(ins, "otherAccidentCost")),
    accidents,
  };
}

/** details.inspect (+ inspect.outer) → the state-inspection block. */
export function buildEncarInspection(details: unknown): CarInspection | undefined {
  const inspect = get(details, "inspect");
  if (inspect == null || typeof inspect !== "object") return undefined;

  // Headline accident-summary verdicts (accident / simple_repair / framework / …).
  const summary: CarInspection["summary"] = [];
  const accSummary = get(inspect, "accident_summary");
  if (accSummary && typeof accSummary === "object") {
    for (const [key, value] of Object.entries(accSummary as Record<string, unknown>)) {
      const v = krYesNo(s(value));
      if (v) summary.push({ label: accidentSummaryLabel(key), value: v });
    }
  }

  // Mechanical-checks grid (each inner key → BG label + status dot tone).
  const mechanics: CarInspection["mechanics"] = [];
  const inner = get(inspect, "inner");
  if (inner && typeof inner === "object") {
    for (const [key, value] of Object.entries(inner as Record<string, unknown>)) {
      const raw = s(value);
      if (!raw) continue;
      mechanics.push({
        label: inspectMechanicLabel(key),
        status: inspectStatusLabel(raw),
        tone: inspectStatusTone(raw),
      });
    }
  }

  // Non-original body panels (outer map: panel → [state]). Empty ⇒ intact body.
  const panels: CarInspection["panels"] = [];
  const outer = get(inspect, "outer");
  if (outer && typeof outer === "object") {
    for (const [key, value] of Object.entries(outer as Record<string, unknown>)) {
      const state = Array.isArray(value) ? s(value[0]) : s(value);
      if (!state) continue;
      panels.push({ label: panelNameLabel(key), status: panelStatusLabel(state) });
    }
  }

  if (summary.length === 0 && mechanics.length === 0 && panels.length === 0) return undefined;
  return { summary, mechanics, panels };
}

/**
 * details.options.standard[] (decoded via korea-options) + details.options_extra[]
 * → the factory-options block. Returns undefined when neither has usable content.
 */
export function buildEncarFactoryOptions(details: unknown): CarFactoryOptions | undefined {
  const standard = groupKoreaOptions(get(details, "options.standard"));

  const extrasRaw = get(details, "options_extra");
  const extras = Array.isArray(extrasRaw)
    ? extrasRaw
        .map((o) => {
          const name = s(get(o, "name"));
          if (!name) return null;
          // NB: `options_extra[].price` is a small integer (e.g. 100, 65) whose unit is
          // ambiguous (likely ENCAR "만원"/10k-won). Rather than render a misleading
          // number we carry the NAME only for now; wire price once the unit is confirmed.
          return { name };
        })
        .filter(Boolean)
    : [];

  if (standard.length === 0 && extras.length === 0) return undefined;
  return { standard, extras: extras as CarFactoryOptions["extras"] };
}

/** details.description_en / description_ko → seller blurb. */
export function buildEncarSellerNote(details: unknown): { en?: string; ko?: string } | undefined {
  const en = s(get(details, "description_en"));
  const ko = s(get(details, "description_ko"));
  if (!en && !ko) return undefined;
  return { en, ko };
}
