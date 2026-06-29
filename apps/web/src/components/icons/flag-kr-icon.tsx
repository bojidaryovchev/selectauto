/** South Korea (Taegukgi) flag, simplified for small inline sizes. 3:2 ratio. */
export function FlagKrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" aria-hidden="true" className={className}>
      <rect width="36" height="24" rx="2" fill="#fff" />
      {/* Taeguk (yin-yang circle) */}
      <g transform="translate(18 12)">
        <path d="M0-6a6 6 0 0 1 0 12z" fill="#cd2e3a" />
        <path d="M0 6a6 6 0 0 1 0-12z" fill="#0047a0" />
        <circle cx="0" cy="-3" r="3" fill="#cd2e3a" />
        <circle cx="0" cy="3" r="3" fill="#0047a0" />
      </g>
      {/* Four trigrams (black bars) at the corners */}
      <g fill="#1f1f1f">
        {/* top-left ☰ */}
        <g transform="translate(7.2 5.6) rotate(33.7)">
          <rect x="-3.2" y="-2.4" width="6.4" height="1.1" />
          <rect x="-3.2" y="-0.55" width="6.4" height="1.1" />
          <rect x="-3.2" y="1.3" width="6.4" height="1.1" />
        </g>
        {/* bottom-right ☷ */}
        <g transform="translate(28.8 18.4) rotate(33.7)">
          <rect x="-3.2" y="-2.4" width="2.7" height="1.1" />
          <rect x="0.5" y="-2.4" width="2.7" height="1.1" />
          <rect x="-3.2" y="-0.55" width="2.7" height="1.1" />
          <rect x="0.5" y="-0.55" width="2.7" height="1.1" />
          <rect x="-3.2" y="1.3" width="2.7" height="1.1" />
          <rect x="0.5" y="1.3" width="2.7" height="1.1" />
        </g>
        {/* top-right ☵ */}
        <g transform="translate(28.8 5.6) rotate(-33.7)">
          <rect x="-3.2" y="-2.4" width="2.7" height="1.1" />
          <rect x="0.5" y="-2.4" width="2.7" height="1.1" />
          <rect x="-3.2" y="-0.55" width="6.4" height="1.1" />
          <rect x="-3.2" y="1.3" width="2.7" height="1.1" />
          <rect x="0.5" y="1.3" width="2.7" height="1.1" />
        </g>
        {/* bottom-left ☲ */}
        <g transform="translate(7.2 18.4) rotate(-33.7)">
          <rect x="-3.2" y="-2.4" width="6.4" height="1.1" />
          <rect x="-3.2" y="-0.55" width="2.7" height="1.1" />
          <rect x="0.5" y="-0.55" width="2.7" height="1.1" />
          <rect x="-3.2" y="1.3" width="6.4" height="1.1" />
        </g>
      </g>
    </svg>
  );
}
