/** United States flag, simplified for small inline sizes. 3:2 ratio. */
export function FlagUsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" aria-hidden="true" className={className}>
      <rect width="36" height="24" fill="#b22234" />
      {/* 6 white stripes over the red field (13 stripes total) */}
      <g fill="#fff">
        <rect y="1.85" width="36" height="1.85" />
        <rect y="5.54" width="36" height="1.85" />
        <rect y="9.23" width="36" height="1.85" />
        <rect y="12.92" width="36" height="1.85" />
        <rect y="16.62" width="36" height="1.85" />
        <rect y="20.31" width="36" height="1.85" />
      </g>
      {/* Canton */}
      <rect width="15" height="12.92" fill="#3c3b6e" />
      {/* Stars, abstracted to a small dot grid */}
      <g fill="#fff">
        {[2.5, 5.5, 8.5, 11.5].flatMap((y) =>
          [2, 5, 8, 11, 13.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" />),
        )}
      </g>
    </svg>
  );
}
