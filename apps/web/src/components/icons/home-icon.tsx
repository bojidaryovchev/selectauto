/** House glyph (24×24), outlined. Used by the mobile bottom-nav "Начало" tab.
 *  Uses currentColor so the tab controls the colour (muted → brand when active). */
export function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 10.5 12 3.75l8.5 6.75" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
      <path d="M9.75 20v-5.25a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1V20" />
    </svg>
  );
}
