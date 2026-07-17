/** Crossed-out eye glyph (24×24). Uses currentColor. Marks the "hide password"
 *  state on the auth password fields' visibility toggle. */
export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M9.88 5.09A9.77 9.77 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.16 3.19m-3.69 2.72A9.4 9.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.6 18.6 0 0 1 5.06-5.94"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9a3 3 0 0 0 4.24 4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m3 3 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
