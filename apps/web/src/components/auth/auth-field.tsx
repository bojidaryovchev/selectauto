import type { ReactNode } from "react";
import { AlertIcon, CircleCheckIcon, TriangleAlertIcon } from "@/components/icons";

/**
 * A form field in the kit, as the account boards draw it: the label (with `aside`, a link at its end, such as
 * „Забравена парола?"), the input, and the field's message under it with an icon. The input takes `fieldErrorProps`
 * so it is marked invalid and points at the message.
 */
export function AuthField({
  id,
  label,
  error,
  aside,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const labelEl = (
    <label className="sa-lbl" htmlFor={id}>
      {label}
    </label>
  );
  return (
    <div className="sa-fld">
      {aside ? (
        <div className="ac-lblrow">
          {labelEl}
          {aside}
        </div>
      ) : (
        labelEl
      )}
      {children}
      {error ? (
        <span id={`${id}-err`} className="sa-err">
          <AlertIcon />
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** The error-state props of an input inside `AuthField`. */
export function fieldErrorProps(id: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-err` : undefined,
  } as const;
}

const ALERT_ICON = { pos: CircleCheckIcon, neg: AlertIcon, warn: TriangleAlertIcon } as const;

/** A result in the kit's alert: green when done, red for a failure (announced at once), amber for a warning. */
export function AuthAlert({ tone, children }: { tone: keyof typeof ALERT_ICON; children: ReactNode }) {
  const Icon = ALERT_ICON[tone];
  return (
    <div className={`sa-alert sa-alert--${tone}`} role={tone === "neg" ? "alert" : "status"}>
      <Icon />
      <div>{children}</div>
    </div>
  );
}

/**
 * The card's content while the page reads its address (`ac-signin-st` 8 and the like): the Google button's bar, a
 * label and a field per input, and the submit button, named „Зареждане".
 */
export function AuthFormSkeleton({ google = false, fields }: { google?: boolean; fields: number }) {
  return (
    <div className="ac-sk" aria-busy="true" aria-label="Зареждане">
      {google ? <div className="sa-sk h-12 rounded-md" /> : null}
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="sa-sk h-3 w-[30%]" />
          <div className="sa-sk h-12 rounded-md" />
        </div>
      ))}
      <div className="sa-sk h-12 rounded-md" />
    </div>
  );
}
