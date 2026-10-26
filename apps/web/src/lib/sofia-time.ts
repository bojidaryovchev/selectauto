/**
 * Dates and times as the business reads them: Bulgarian format, Sofia time,
 * whatever the clock of the machine doing the formatting. Vercel's servers run
 * UTC, so a bare `toLocaleString("bg-BG")` printed times 2–3 h early when a page
 * rendered on the server — and differently from the same component rendered in
 * a browser in Bulgaria. Pure, so it is safe in server and client components.
 */
const DATE_TIME = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  dateStyle: "medium",
  timeStyle: "short",
});
const DATE = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "medium" });

/** „26.10.2026 г., 14:05" */
export function formatSofiaDateTime(value: Date | string | number): string {
  return DATE_TIME.format(new Date(value));
}

/** „26.10.2026 г." */
export function formatSofiaDate(value: Date | string | number): string {
  return DATE.format(new Date(value));
}
