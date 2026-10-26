/**
 * A filter or choice pill, 40 px tall. The chosen one is solid ink: orange is
 * kept for actions, and orange text on its own tint reads at 3:1 — too faint
 * to tell which pill is chosen. Fits a <button aria-pressed> (focus-visible)
 * and a <label> around a visually hidden radio or checkbox (has-focus-visible);
 * `disabled` dims it for a control that can't be changed.
 */
export function adminChipClass(active: boolean, disabled = false): string {
  return `inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
  } ${active ? "border-ink bg-ink text-white" : `border-line bg-white text-ink ${disabled ? "" : "hover:bg-neutral-50"}`}`;
}
