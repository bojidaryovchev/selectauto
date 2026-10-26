"use client";

import { MenuIcon } from "@/components/icons";
import type { AdminNavGroup } from "@/constants/admin-nav";
import { Drawer } from "@base-ui/react/drawer";
import { useEffect, useState } from "react";
import type { AdminAccount } from "./admin-account-card";
import { AdminBrand } from "./admin-brand";
import { AdminNavDrawer } from "./admin-nav-drawer";

/**
 * Below lg: a sticky bar with the menu button and the brand — nothing else, so
 * it fits a 320 px phone. The button opens AdminNavDrawer; the open state lives
 * here so a tapped link can close the drawer (the layout outlives navigations).
 */
export function AdminTopBar({
  groups,
  homeHref,
  account,
}: {
  groups: AdminNavGroup[];
  homeHref: string;
  account: AdminAccount;
}) {
  const [open, setOpen] = useState(false);

  // The bar and its drawer exist only below lg. If the window grows past it
  // with the drawer open (a tablet turned sideways), close it: merely hidden,
  // the drawer would keep the page scroll-locked and inert.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="left">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-white/95 px-2 backdrop-blur-sm lg:hidden">
        <Drawer.Trigger
          aria-label="Меню"
          className="grid size-11 place-items-center rounded-xl text-ink transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand active:bg-neutral-200"
        >
          <MenuIcon className="size-6" />
        </Drawer.Trigger>
        <AdminBrand href={homeHref} tone="light" />
      </header>
      <AdminNavDrawer groups={groups} homeHref={homeHref} account={account} onNavigate={() => setOpen(false)} />
    </Drawer.Root>
  );
}
