/** Location/map-pin glyph (24×24). Uses currentColor. Used by the contacts-page
 *  map placeholder (click-to-load consent) and anywhere a "where we are" marker is
 *  needed. */
export function LocationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a7 7 0 0 0-7 7c0 4.5 5.4 10.74 6.24 11.68a1.02 1.02 0 0 0 1.52 0C13.6 19.74 19 13.5 19 9a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}
