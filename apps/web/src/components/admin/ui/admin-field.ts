/**
 * Form-control styles shared by the admin forms: the kit's field, 44 px tall in the admin (`.bo-in`), 16 px text (the
 * kit's size, which also keeps iOS Safari from zooming into a focused field).
 */

/**
 * A control without a width — for the few with a fixed one (`${ADMIN_CONTROL} w-28`).
 * Two widths in one class list would be decided by stylesheet order, not by
 * which comes last, so ADMIN_INPUT's `w-full` can't be overridden in place
 * (a responsive one, `sm:w-72`, can).
 */
export const ADMIN_CONTROL = "sa-in bo-in min-w-0";

export const ADMIN_INPUT = `${ADMIN_CONTROL} w-full`;

export const ADMIN_SELECT = `${ADMIN_INPUT} pr-8`;

export const ADMIN_LABEL = "sa-lbl";

/** The small line under a field. */
export const ADMIN_HINT = "sa-hint";
