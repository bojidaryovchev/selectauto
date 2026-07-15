/** Alert circle (24×24) — an exclamation in a ring, used by the sign-in error page. */
export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5v5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.3" fill="currentColor" />
    </svg>
  );
}
