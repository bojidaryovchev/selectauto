/** Google "G" logo (multi-colour, 24×24). Brand colours are fixed (not
 *  currentColor) per Google's mark guidelines. */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.1 0 5.7-1.03 7.6-2.79l-3.72-2.88c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.72H1.76v2.97A11.5 11.5 0 0 0 12 23.5z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.21a6.9 6.9 0 0 1 0-4.42V6.82H1.76a11.5 11.5 0 0 0 0 10.36l3.84-2.97z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.68 0 3.19.58 4.38 1.71l3.28-3.28C17.7 1.28 15.1.25 12 .25A11.5 11.5 0 0 0 1.76 6.82l3.84 2.97C6.5 7.07 9.02 4.75 12 4.75z"
      />
    </svg>
  );
}
