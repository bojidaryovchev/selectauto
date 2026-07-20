"use client";

import { useEffect, useState } from "react";

/**
 * Live "Отворено сега / Затворено" indicator for the working-hours card — a
 * coloured dot plus a line telling the visitor when the showroom next
 * opens/closes.
 *
 * Schedule (local time): Mon–Fri 09:00–18:00, Sat 09:00–17:00, Sun 11:00–17:00.
 * Kept in sync with the `HOURS` table in contact-cards.tsx and with
 * `BUSINESS.openingHours` (schema.org) in constants.
 *
 * Hydration safety: `new Date()` is client-only, so on the server and the very
 * first client render we show a neutral "Проверка…" state; the real status is
 * computed in an effect after mount and refreshed every 30s. This avoids an
 * SSR/CSR text mismatch under cacheComponents.
 */

type Slot = { start: string; end: string };

// Keyed by Date.getDay() (0 = Sunday). Empty array = closed all day.
const SCHEDULE: Record<number, Slot[]> = {
  0: [{ start: "11:00", end: "17:00" }],
  1: [{ start: "09:00", end: "18:00" }],
  2: [{ start: "09:00", end: "18:00" }],
  3: [{ start: "09:00", end: "18:00" }],
  4: [{ start: "09:00", end: "18:00" }],
  5: [{ start: "09:00", end: "18:00" }],
  6: [{ start: "09:00", end: "17:00" }],
};

const DAY_NAMES = [
  "неделя",
  "понеделник",
  "вторник",
  "сряда",
  "четвъртък",
  "петък",
  "събота",
];

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

type Status =
  | { state: "loading" }
  | { state: "open"; hint: string }
  | { state: "closed"; hint: string };

/** Finds the next opening moment from `now` (scanning up to a week ahead). */
function findNextOpen(now: Date): { date: Date; start: string } | null {
  for (let add = 0; add < 8; add++) {
    const d = new Date(now);
    d.setDate(now.getDate() + add);
    const slots = SCHEDULE[d.getDay()] ?? [];
    if (!slots.length) continue;

    const currentMin = add === 0 ? d.getHours() * 60 + d.getMinutes() : -1;
    for (const s of slots) {
      const start = toMin(s.start);
      const end = toMin(s.end);
      if (add === 0 && currentMin >= start && currentMin < end) return null; // open now
      if (add > 0 || currentMin < start) return { date: d, start: s.start };
    }
  }
  return null;
}

function computeStatus(now: Date): Status {
  const slots = SCHEDULE[now.getDay()] ?? [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openSlot = slots.find((s) => nowMin >= toMin(s.start) && nowMin < toMin(s.end));

  if (openSlot) {
    return { state: "open", hint: `Затваря в ${openSlot.end}` };
  }

  const next = findNextOpen(now);
  if (!next) return { state: "closed", hint: "" };

  const isToday = next.date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = next.date.toDateString() === tomorrow.toDateString();

  const when = isToday
    ? `днес в ${next.start}`
    : isTomorrow
      ? `утре в ${next.start}`
      : `в ${DAY_NAMES[next.date.getDay()]} в ${next.start}`;

  return { state: "closed", hint: `Отваря ${when}` };
}

export function HoursStatus() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const update = () => setStatus(computeStatus(new Date()));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  const dot =
    status.state === "open"
      ? "bg-[#22c55e] shadow-[0_0_0_6px_rgba(34,197,94,0.18)]"
      : status.state === "closed"
        ? "bg-[#ef4444] shadow-[0_0_0_6px_rgba(239,68,68,0.18)]"
        : "bg-[#94a3b8] shadow-[0_0_0_6px_rgba(148,163,184,0.18)]";

  const label =
    status.state === "open"
      ? "Отворено сега"
      : status.state === "closed"
        ? "Затворено"
        : "Проверка…";

  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-[#fafafa] p-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`}
      />
      <div className="text-sm">
        <span className="font-extrabold text-[#17181b]">{label}</span>
        {status.state !== "loading" && status.hint && (
          <span className="text-[#5a5d64]"> · {status.hint}</span>
        )}
      </div>
    </div>
  );
}
