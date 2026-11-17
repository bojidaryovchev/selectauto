/**
 * The „Нощно шосе" button kinds and sizes (Components board, `kit-components`):
 *
 * - `pri`: orange, chamfered; the one primary action of a view;
 * - `sec`: outline; `ton`: a filled surface; `txt`: a text link;
 * - `neg`: destructive; `pos`: confirms a success; `vb`: the Viber group.
 *
 * Sizes: `sm` 36 px (dense admin), `md` 44 px (cards, dense rows), `lg` 48 px (the default; matches every input),
 * `xl` 56 px (hero calls to action). Labels stay on one line.
 */
export type ButtonVariant = "pri" | "sec" | "ton" | "txt" | "neg" | "pos" | "vb";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export type ButtonStyleProps = {
  /** The button's kind. Without it, the element keeps its legacy, caller-styled look. */
  variant?: ButtonVariant;
  /** Height and type size; `lg` (48 px) by default. */
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
};

/** The kit classes for a button kind, size and width, ready for `className`. */
export function buttonClasses({ variant, size = "lg", block = false }: ButtonStyleProps & { variant: ButtonVariant }) {
  return ["sa-btn", `sa-btn--${variant}`, size === "lg" ? null : `sa-btn--${size}`, block ? "sa-btn--block" : null]
    .filter(Boolean)
    .join(" ");
}
