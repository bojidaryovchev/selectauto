/** Target / bullseye glyph (24×24). Uses currentColor. Replaces the 🎯 emoji on
 *  the "Подбор с мисъл" pillar of the "Защо SelectAuto" home section. */
export function TargetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
