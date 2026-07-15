"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, ConfirmDialog } from "@/components/common";
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
 *    server's returned state (and roll back on failure). The context keeps every
 *    mounted copy of the card (grid + detail + /lyubimi) in sync.
 *
 * `size` controls the touch target; `variant="overlay"` is the translucent
 * on-image style used on cards, `variant="solid"` the bordered style for the
 * detail page header.
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
}: {
  carId: number;
  size?: "md" | "lg";
  variant?: "overlay" | "solid";
  confirmOnRemove?: boolean;
}) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const router = useRouter();
  const pathname = usePathname();
  const { isFavorite, setFavorite } = useFavorites();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const favorited = isFavorite(carId);

  const dimensions = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const iconSize = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const base =
    variant === "overlay"
      ? "bg-white/90 shadow-md ring-1 ring-black/[0.04] backdrop-blur-sm hover:bg-white"
      : "border border-line bg-white shadow-card hover:border-brand/40";

  const label = favorited ? "Премахни от любими" : "Запази в любими";

  // The actual toggle: optimistic flip, then reconcile with the server result.
  const runToggle = () => {
    const optimistic = !favorited;
    setFavorite(carId, optimistic);
    startTransition(async () => {
      const result = await toggleFavorite(carId);
      if (result.success) {
        setFavorite(carId, result.data.favorited);
      } else {
        // Roll back on failure (e.g. session expired between render and click).
        setFavorite(carId, !optimistic);
      }
    });
  };

  const handleClick = () => {
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
      <Button
        onClick={handleClick}
        disabled={isPending}
        rippleTheme="dark"
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        className={`grid ${dimensions} place-items-center rounded-full transition-transform duration-150 hover:scale-110 disabled:opacity-60 ${base} ${
          favorited ? "text-brand" : "text-[#333]"
        }`}
      >
        <HeartIcon className={iconSize} filled={favorited} />
      </Button>

      {confirmOnRemove ? (
        <ConfirmDialog
          isOpen={confirmOpen}
          tone="danger"
          icon={<HeartIcon className="size-8" filled />}
          title="Премахване от любими"
          message="Сигурни ли сте, че искате да премахнете този автомобил от списъка със запазени?"
          confirmLabel="Премахни"
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
