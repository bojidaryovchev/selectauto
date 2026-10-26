/** Leftward arrow (24×24), the mirror of ArrowRightIcon. The admin sidebar's „Към сайта“. */
export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M19 12H5M11 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
