/** Car glyph (24×24), outlined. Used by the mobile bottom-nav "Автомобили" tab.
 *  Uses currentColor so the tab controls the colour (muted → brand when active). */
export function CarIcon({ className }: { className?: string }) {
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
      <path d="M4 15.5v2a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-1M20 15.5v2a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1" />
      <path d="M3.5 15.5v-2.7a2 2 0 0 1 .34-1.12l1.2-1.78 1.3-3.05A2 2 0 0 1 8.18 5.5h7.64a2 2 0 0 1 1.84 1.35l1.3 3.05 1.2 1.78a2 2 0 0 1 .34 1.12v2.7a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" />
      <path d="M5 11h14" />
      <circle cx="7.5" cy="13.25" r=".6" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="13.25" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}
