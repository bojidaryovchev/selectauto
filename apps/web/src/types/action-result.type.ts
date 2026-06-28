/**
 * Discriminated result type returned by server actions (mutations). Adopted from
 * the ecommerce-store architecture: an action never throws for an expected
 * failure — it returns `{ success: false, error }` so the client can branch on
 * `result.success` and surface `error` in the UI. The generic `T` is the
 * payload on success (defaults to `void` for actions that return nothing).
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
