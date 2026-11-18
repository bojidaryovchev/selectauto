import Link from "next/link";
import { buttonClasses, type ButtonVariant } from "@/components/common/button-variants";

export type AdminButtonVariant = "primary" | "secondary" | "danger" | "positive" | "success" | "ghost";
export type AdminButtonSize = "md" | "lg";

/**
 * The admin's kinds as the kit's buttons (boards `ab-*`, `ad-*`): primary orange, secondary outline, danger the kit's
 * negative, success its positive („Запазете плащането"), ghost a text button. „Positive" is an affirming secondary
 * („Отбележете като изпратено"), drawn as an outline button with the deals' green accent (`ab-btn-pos`).
 */
const VARIANTS: Record<AdminButtonVariant, { kit: ButtonVariant; extra?: string }> = {
  primary: { kit: "pri" },
  secondary: { kit: "sec" },
  danger: { kit: "neg" },
  positive: { kit: "sec", extra: "ab-btn-pos" },
  success: { kit: "pos" },
  ghost: { kit: "txt" },
};

/** Class names for an admin button — for the rare control that can't use AdminButton (a <summary>, a label). 44 px
 *  tall (md) or 48 px (lg, the main action of a form or page). */
export function adminButtonClass(variant: AdminButtonVariant = "secondary", size: AdminButtonSize = "md"): string {
  const { kit, extra } = VARIANTS[variant];
  return `${buttonClasses({ variant: kit, size })}${extra ? ` ${extra}` : ""}`;
}

type Common = { variant?: AdminButtonVariant; size?: AdminButtonSize; className?: string };

/** A <button>. `type` defaults to "button" — pass `type="submit"` for a form's action. */
export function AdminButton({
  variant,
  size,
  className,
  type = "button",
  ...props
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`${adminButtonClass(variant, size)} ${className ?? ""}`} {...props} />;
}

/** A link styled as a button (navigation, downloads). */
export function AdminButtonLink({ variant, size, className, ...props }: Common & React.ComponentProps<typeof Link>) {
  return <Link className={`${adminButtonClass(variant, size)} ${className ?? ""}`} {...props} />;
}
