/** 360° panorama glyph (24×24) — a rotation arc around a car, for the IAAI
 *  360° spin-viewer button on the car detail page. Uses currentColor. */
export function PanoramaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 5c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4c0-1.3 1.4-2.46 3.56-3.19" />
      <path d="m9 3-2.5 2.5L9 8" />
      <circle cx="12" cy="17.5" r="2.5" />
    </svg>
  );
}
