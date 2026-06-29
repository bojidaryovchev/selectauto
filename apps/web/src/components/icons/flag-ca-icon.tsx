/** Canada flag, simplified for small inline sizes. 3:2 ratio. */
export function FlagCaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" aria-hidden="true" className={className}>
      <rect width="36" height="24" rx="2" fill="#fff" />
      {/* Red side bars (each 1/4 of the width) */}
      <path d="M0 0h9v24H0zM27 0h9v24h-9z" fill="#d52b1e" rx="2" />
      {/* Maple leaf, centered */}
      <path
        fill="#d52b1e"
        d="M18 5.2l.95 2.2c.16.36.45.32.74.16l1.15-.7-.55 2.85c-.12.6.2.6.4.36l1.5-1.7.4 1c.07.18.2.16.4.12l1.5-.32-.55 1.95c-.1.32-.13.45.1.62l.6.45-2.55 2.15c-.25.22-.18.3-.1.66l.2.86-2.4-.42c-.3-.05-.46.02-.47.27l.1 2.6h-.7l.1-2.6c0-.25-.16-.32-.46-.27l-2.4.42.2-.86c.08-.36.15-.44-.1-.66l-2.55-2.15.6-.45c.24-.17.2-.3.1-.62l-.55-1.95 1.5.32c.2.04.33.06.4-.12l.4-1 1.5 1.7c.2.24.52.24.4-.36l-.55-2.85 1.15.7c.3.16.58.2.74-.16z"
      />
    </svg>
  );
}
