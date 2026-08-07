/**
 * The «Последно използвано» pill that marks whichever sign-in control this
 * browser last authenticated with (see `hooks/use-last-auth-method.ts`).
 *
 * Rendered as a SIBLING of the button inside a `relative` wrapper, never a child:
 * `<Button>` is `overflow-hidden` (it hosts the click <Ripple>), which would clip
 * a pill overlapping its top border. `pointer-events-none` keeps it from eating
 * clicks aimed at the button underneath, and `id` is wired to the button's
 * `aria-describedby` so screen readers announce it as part of that button instead
 * of as stray floating text.
 */
export function LastUsedBadge({ id }: { id: string }) {
  return (
    <span
      id={id}
      className="pointer-events-none absolute -top-2.5 right-3 z-1 rounded-full border border-brand/60 bg-white px-2.5 py-0.5 text-[11px] font-bold text-brand-dark shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
    >
      Последно използвано
    </span>
  );
}
