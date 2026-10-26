/**
 * Form-control styles shared by the admin forms.
 *
 * The text size is 16 px on phones and on every iOS/iPadOS device: iOS Safari
 * zooms the page into any field smaller than that when it gets focus. Desktops
 * get the denser 14 px. `-webkit-touch-callout` is supported only by iOS WebKit,
 * the same test Base UI's demos use to single out iOS.
 */
const TEXT = "text-base sm:text-sm supports-[-webkit-touch-callout:none]:text-base";

/**
 * A control without a width — for the few with a fixed one (`${ADMIN_CONTROL} w-28`).
 * Two widths in one class list would be decided by stylesheet order, not by
 * which comes last, so ADMIN_INPUT's `w-full` can't be overridden in place
 * (a responsive one, `sm:w-72`, can).
 */
export const ADMIN_CONTROL = `block min-h-11 min-w-0 rounded-lg border border-line bg-white px-3 py-2 ${TEXT} text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:bg-neutral-50 disabled:text-muted`;

export const ADMIN_INPUT = `${ADMIN_CONTROL} w-full`;

export const ADMIN_SELECT = `${ADMIN_INPUT} pr-8`;

export const ADMIN_LABEL = "text-sm font-semibold text-ink";

/** The small grey line under a field. */
export const ADMIN_HINT = "text-xs text-muted";
