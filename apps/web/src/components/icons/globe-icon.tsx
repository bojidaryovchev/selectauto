/** Globe / world icon (24×24) — used for the "all markets" segment. */
export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3.2 9.5h17.6M3.2 14.5h17.6M12 3v18" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
