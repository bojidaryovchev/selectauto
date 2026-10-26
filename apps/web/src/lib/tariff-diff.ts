import type { UsInlandTariff } from "@/data/us-transport-tariffs";
import type { UsTariffData } from "@/lib/us-transport";

/**
 * What a pasted tariff table would change, compared with the one the calculator
 * uses now — shown before the paste goes live (/admin/tarifi). A paste used to
 * replace the whole table at once, so a partial selection quietly left hundreds
 * of yards without a transport price.
 *
 * Rows are matched the way the resolver finds them (lib/us-transport.ts): by
 * auction + location, whitespace-collapsed and case-insensitive, the first row
 * winning when a key repeats.
 */

/** A row or container price that differs: what it is, its old and new value. */
export type TariffChange = { label: string; from: string; to: string };

/** A group of differences: how many, and the first few to show. */
export type TariffDiffGroup<T> = { count: number; sample: T[] };

export type TariffDiff = {
  /** Locations only the new table prices. */
  added: TariffDiffGroup<string>;
  /** Locations the new table no longer prices — no total for cars from there. */
  removed: TariffDiffGroup<string>;
  /** Locations whose inland price or terminal changes. */
  changed: TariffDiffGroup<TariffChange>;
  unchanged: number;
  /** Container prices per car (configuration × terminal) that change, appear or go. */
  container: TariffDiffGroup<TariffChange>;
};

const SAMPLE = 20;

function key(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function byLocation(rows: UsInlandTariff[]): Map<string, UsInlandTariff> {
  const map = new Map<string, UsInlandTariff>();
  for (const r of rows) {
    const k = `${key(r.auction)}|${key(r.location)}`;
    if (!map.has(k)) map.set(k, r);
  }
  return map;
}

function group<T>(items: T[]): TariffDiffGroup<T> {
  return { count: items.length, sample: items.slice(0, SAMPLE) };
}

const place = (r: UsInlandTariff) => `${r.location} (${r.auction})`;
const route = (r: UsInlandTariff) => `${r.inland} $ · ${r.terminal}`;

export function diffTariffs(current: UsTariffData, next: UsTariffData): TariffDiff {
  const before = byLocation(current.inland);
  const after = byLocation(next.inland);

  const added: string[] = [];
  const changed: TariffChange[] = [];
  let unchanged = 0;
  for (const [k, row] of after) {
    const old = before.get(k);
    if (!old) added.push(place(row));
    else if (old.inland !== row.inland || old.terminal !== row.terminal) {
      changed.push({ label: place(row), from: route(old), to: route(row) });
    } else unchanged += 1;
  }
  const removed = [...before].filter(([k]) => !after.has(k)).map(([, row]) => place(row));

  const container: TariffChange[] = [];
  for (const config of new Set([...Object.keys(current.container), ...Object.keys(next.container)])) {
    const was = current.container[config] ?? {};
    const now = next.container[config] ?? {};
    for (const terminal of new Set([...Object.keys(was), ...Object.keys(now)])) {
      if (was[terminal] === now[terminal]) continue;
      container.push({
        label: `${config} · ${terminal}`,
        from: was[terminal] === undefined ? "—" : `${was[terminal]} $`,
        to: now[terminal] === undefined ? "—" : `${now[terminal]} $`,
      });
    }
  }

  return {
    added: group(added),
    removed: group(removed),
    changed: group(changed),
    unchanged,
    container: group(container),
  };
}
