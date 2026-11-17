"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ConfirmDialog, IconButton } from "@/components/common";
import { HeartIcon } from "@/components/icons";
import { useFavorites } from "@/contexts/favorites-context";
import { toggleFavorite } from "@/mutations/favorites";

/**
 * Heart toggle for saving a car to favourites. Rendered as an overlay on the
 * listing cards and on the detail page.
 *
 * Behaviour:
 *  - Signed OUT → the heart is still shown (discoverable), but a click sends the
 *    user to /sign-in (with a `redirectTo` back to the current page) instead of
 *    toggling. No favourite is attempted until they're in.
 *  - Signed IN → clicking calls the `toggleFavorite` action. State is optimistic:
 *    we flip the shared FavoritesContext immediately, then reconcile with the
 *    server's returned state (and roll back on failure, a lost connection
 *    included). The context keeps every mounted copy of the card (grid + detail
 *    + /lyubimi) in sync.
 *  - While the session or the saved cars are still loading, a click does
 *    nothing: before they arrive every heart reads empty, and the action toggles.
 *
 * `size` controls the touch target (44 or 48 px); `variant="overlay"` is the
 * translucent on-photo style used on cards, `variant="solid"` the surface style
 * for the detail page header. A saved car shows an orange, filled heart.
 *
 * `confirmOnRemove` gates removal behind a confirmation dialog — used on the
 * /lyubimi page, where a click means "take this off my saved list" and an
 * accidental tap would silently drop the card. Adding to favourites is never
 * gated (it's cheap to undo); only the favourited→unfavourited direction asks.
 */
export function FavoriteButton({
  carId,
  size = "md",
  variant = "overlay",
  confirmOnRemove = false,
  className,
}: {
  carId: number;
  size?: "md" | "lg";
  variant?: "overlay" | "solid";
  confirmOnRemove?: boolean;
  /** Placement from the caller, e.g. the card's `sa-car__fav` corner. */
  className?: string;
}) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const router = useRouter();
  const pathname = usePathname();
  const { isFavorite, setFavorite, initialized } = useFavorites();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const favorited = isFavorite(carId);
  const label = favorited ? "Премахнете от любими" : "Запазете в любими";

  // The actual toggle: optimistic flip, then reconcile with the server result.
  const runToggle = () => {
    const optimistic = !favorited;
    setFavorite(carId, optimistic);
    startTransition(async () => {
      // A request that never arrives (offline, a dropped connection) REJECTS, and an error thrown inside a transition
      // goes to the error boundary, which replaces the whole page. So it rolls back like a refused one instead.
      const result = await toggleFavorite(carId).catch(() => null);
      if (result?.success) {
        setFavorite(carId, result.data.favorited);
      } else {
        // Roll back on failure (e.g. session expired between render and click, or no connection).
        setFavorite(carId, !optimistic);
      }
    });
  };

  const handleClick = () => {
    // The session is still loading: a signed-in visitor would otherwise be sent to sign-in (REDESIGN.md, bugs).
    if (status === "loading") return;
    // Signed in, but the saved cars haven't loaded: every heart still reads empty, so a tap on a saved car would remove
    // it — on /lyubimi without the question below. Wait for the list.
    if (isSignedIn && !initialized) return;
    // Signed out → go to sign-in, returning to the current page afterwards.
    if (!isSignedIn) {
      const back = encodeURIComponent(pathname || "/");
      router.push(`/sign-in?redirectTo=${back}`);
      return;
    }
    // Removing while gated → ask first. Adding is never gated.
    if (confirmOnRemove && favorited) {
      setConfirmOpen(true);
      return;
    }
    runToggle();
  };

  return (
    <>
      <IconButton
        label={label}
        title={label}
        variant={variant === "overlay" ? "over" : "default"}
        size={size === "lg" ? "lg" : "md"}
        pressed={favorited}
        onClick={handleClick}
        disabled={isPending}
        className={`disabled:opacity-60 ${className ?? ""}`}
      >
        <HeartIcon filled={favorited} />
      </IconButton>

      {confirmOnRemove ? (
        <ConfirmDialog
          isOpen={confirmOpen}
          tone="danger"
          icon={<HeartIcon filled />}
          title="Премахване от любими"
          message="Сигурни ли сте, че искате да премахнете този автомобил от списъка със запазени?"
          confirmLabel="Премахнете"
          cancelLabel="Отказ"
          isPending={isPending}
          onConfirm={() => {
            setConfirmOpen(false);
            runToggle();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
  );
}
