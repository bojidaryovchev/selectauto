"use client";

import { MenuIcon } from "@/components/icons";
import type { AdminNavGroup } from "@/constants/admin-nav";
import { Drawer } from "@base-ui/react/drawer";
import { useEffect, useState } from "react";
import type { AdminAccount } from "./admin-account-card";
import { AdminBrand } from "./admin-brand";
import { AdminNavDrawer } from "./admin-nav-drawer";

/**
 * Below 1024 px (board `ad-shell-phone`): the kit's top bar with the menu button and the brand — nothing else, so it
 * fits a 320 px phone (the kit hides `.sa-tbar` from 1024 px). The button opens AdminNavDrawer; the open state lives
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
      <header className="sa-tbar ad-tbar">
        <div className="ad-tbar__l">
          <Drawer.Trigger aria-label="Меню" className="sa-ib sa-ib--ghost">
            <MenuIcon />
          </Drawer.Trigger>
          <AdminBrand href={homeHref} compact />
        </div>
      </header>
      <AdminNavDrawer groups={groups} homeHref={homeHref} account={account} onNavigate={() => setOpen(false)} />
    </Drawer.Root>
  );
}
