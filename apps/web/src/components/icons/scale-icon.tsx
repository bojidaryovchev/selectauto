/** Balance-scales glyph (24×24). Uses currentColor. Replaces the ⚖️ emoji on the
 *  "Стратегия и преценка" pillar of the "Защо SelectAuto" home section. */
export function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3v17M6 20h12M5 7h14M8 7 5 14M5 7 2 14M16 7l3 7M16 7l3 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 14a3 3 0 0 0 6 0M16 14a3 3 0 0 0 6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
