/** Megaphone (24×24), outlined. The admin sidebar's mobile.bg (advert publishing). */
export function MegaphoneIcon({ className }: { className?: string }) {
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
      <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M7 15v3.5a1.5 1.5 0 0 0 3 0v-2" />
      <path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}
