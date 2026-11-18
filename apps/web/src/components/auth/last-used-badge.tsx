/**
 * The „Последно използвано" badge on whichever sign-in control this browser last authenticated with (see
 * `hooks/use-last-auth-method.ts`; boards `ac-signin-st` 2–3). It sits on the control's top edge inside an `.ac-lu`
 * wrapper, lets clicks through, and its `id` is the control's `aria-describedby`, so screen readers read it with the
 * button rather than as stray text.
 */
export function LastUsedBadge({ id }: { id: string }) {
  return (
    <span id={id} className="ac-lu__b">
      Последно използвано
    </span>
  );
}
