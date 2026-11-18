/**
 * A filter or choice pill: the kit's chip, solid when chosen (`.is-on`). Fits a <button aria-pressed> (focus-visible)
 * and a <label> around a visually hidden radio or checkbox (has-focus-visible); `disabled` dims it for a control that
 * can't be changed.
 */
export function adminChipClass(active: boolean, disabled = false): string {
  return `sa-chip shrink-0 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ortx ${
    active ? "is-on" : ""
  } ${disabled ? "cursor-not-allowed opacity-50" : ""}`;
}
