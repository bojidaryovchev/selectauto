/** Bank building (24×24), outlined. The admin sidebar's „Получатели“ (payees and their bank accounts). */
export function BankIcon({ className }: { className?: string }) {
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
      <path d="M3 9h18l-9-5Z" />
      <path d="M6 12v5M10 12v5M14 12v5M18 12v5" />
      <path d="M3 20h18" />
    </svg>
  );
}
