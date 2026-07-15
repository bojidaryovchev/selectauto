/** Five-point star glyph (24×24), filled with currentColor. Replaces the ★ text
 *  stars in review-rating displays (otzivi page, hub testimonials). */
export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5Z" />
    </svg>
  );
}
