/**
 * Money helpers for the contracts & payments module. All DB money columns are
 * NUMERIC(12,2), which Drizzle reads/writes as STRINGS ("1925.54") — floats
 * never touch stored amounts. Arithmetic happens on integer cents.
 */

/**
 * Parse a human-entered amount ("1 925,54", "1925.54", "15 480") to integer
 * cents, or null when the input isn't a valid non-negative amount with at most
 * two decimals. Accepts space/nbsp thousands separators and comma or dot as the
 * decimal separator (BG keyboards produce both).
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[\s ]/g, "").replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0") || "0");
}

/** Integer cents → NUMERIC(12,2) string for Drizzle ("192554" cents → "1925.54"). */
export function centsToDb(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** NUMERIC(12,2) string from Drizzle ("1925.54") → integer cents. Bad input → 0. */
export function dbToCents(value: string | null | undefined): number {
  if (!value) return 0;
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) return 0;
  const cents = Number(m[2]) * 100 + Number((m[3] ?? "").padEnd(2, "0") || "0");
  return m[1] === "-" ? -cents : cents;
}

/** Display formatting: 192554 cents → "1 925,54" (bg-BG grouping, always 2 decimals). */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** Display formatting straight from a NUMERIC(12,2) DB string. */
export function formatDbAmount(value: string | null | undefined): string {
  return formatCents(dbToCents(value));
}

/**
 * DOCUMENT formatting: space thousands + DOT decimals ("1 925.54") — the
 * convention of the paper известия (bg-BG UI formatting uses a comma instead).
 */
export function formatCentsDoc(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${whole}.${String(abs % 100).padStart(2, "0")}`;
}
