/** Wallet (24×24), outlined. The admin sidebar's „Депозити“. */
export function WalletIcon({ className }: { className?: string }) {
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
      <rect x="3.5" y="5.5" width="17" height="14" rx="2.5" />
      <path d="M20.5 10h-4a2 2 0 0 0 0 4h4" />
      <path d="M16.5 12h.01" />
    </svg>
  );
}
