/** Document under a magnifier (24×24), outlined. The admin sidebar's Carfax inbox. */
export function FileSearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M19 11V8l-5-5H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M14 3v5h5" />
      <circle cx="16" cy="16" r="3" />
      <path d="m18.2 18.2 2.3 2.3" />
    </svg>
  );
}
