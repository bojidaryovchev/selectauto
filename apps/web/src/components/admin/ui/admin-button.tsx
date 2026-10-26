import Link from "next/link";

export type AdminButtonVariant = "primary" | "secondary" | "danger" | "positive" | "success" | "ghost";
export type AdminButtonSize = "md" | "lg";

const VARIANTS: Record<AdminButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-line bg-white text-ink hover:bg-neutral-50",
  danger: "border border-[#f3c4bf] bg-[#fdecea] text-[#b3261e] hover:bg-[#fbdcd8]",
  positive: "border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  ghost: "text-brand hover:bg-brand/10",
};

// 40 px tall at least (44 for the main action of a form or page), so every
// button is a comfortable tap target; the label may wrap rather than overflow.
const SIZES: Record<AdminButtonSize, string> = {
  md: "min-h-10 px-4",
  lg: "min-h-11 px-6",
};

/** Class names for an admin button — for the rare control that can't use AdminButton (a <summary>, a label). */
export function adminButtonClass(variant: AdminButtonVariant = "secondary", size: AdminButtonSize = "md"): string {
  return `inline-flex items-center justify-center gap-2 rounded-full text-center text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]}`;
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
