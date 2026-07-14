/** Play/triangle glyph (24×24) — for the engine-run video button on the car
 *  detail page. Uses currentColor. */
export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
