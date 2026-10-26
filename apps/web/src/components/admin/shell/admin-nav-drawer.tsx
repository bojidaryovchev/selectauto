"use client";

import { CloseIcon } from "@/components/icons";
import type { AdminNavGroup } from "@/constants/admin-nav";
import { Drawer } from "@base-ui/react/drawer";
import { AdminAccountCard, type AdminAccount } from "./admin-account-card";
import { AdminBrand } from "./admin-brand";
import { AdminNavList } from "./admin-nav-list";

/**
 * The phone/tablet navigation: the sidebar's content in a Base UI Drawer that
 * slides in from the left. Base UI supplies the focus trap, Escape, outside
 * press, the page scroll lock and swipe-to-close; must sit inside the
 * `Drawer.Root` of AdminTopBar, which owns the open state.
 *
 * The popup is `--bleed` wider than it looks and pulled that far past the left
 * edge (padding keeps the content in place), so dragging it outward never opens
 * a gap — Base UI's side-drawer recipe. On iOS (`-webkit-touch-callout`) the
 * recipe drops the bleed, and so does this. z-60 sits above the top bar (30),
 * the sidebar (40) and the lead drawer (50); dialogs and popups portal above.
 */
export function AdminNavDrawer({
  groups,
  homeHref,
  account,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  homeHref: string;
  account: AdminAccount;
  onNavigate: () => void;
}) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop className="fixed inset-0 z-60 min-h-dvh bg-black opacity-[calc(0.5*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute motion-reduce:transition-none" />
      <Drawer.Viewport className="fixed inset-0 z-60 flex justify-start">
        <Drawer.Popup className="-ml-(--bleed) flex h-full w-[calc(min(85vw,20rem)+var(--bleed))] transform-[translateX(var(--drawer-swipe-movement-x))] touch-auto flex-col bg-linear-to-b from-[#121318] to-[#0b0c10] pl-(--bleed) text-[#f2f3f5] transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none [--bleed:3rem] data-ending-style:transform-[translateX(calc(-100%+var(--bleed)-2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-[translateX(calc(-100%+var(--bleed)-2px))] data-swiping:select-none supports-[-webkit-touch-callout:none]:[--bleed:0px] motion-reduce:transition-none">
          <Drawer.Content className="flex min-h-0 flex-1 flex-col">
            <Drawer.Title className="sr-only">Меню на админ панела</Drawer.Title>
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/8 pr-2 pl-5">
              <AdminBrand href={homeHref} tone="dark" onNavigate={onNavigate} />
              <Drawer.Close
                aria-label="Затвори менюто"
                className="grid size-11 place-items-center rounded-xl bg-white/8 text-white transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-soft active:bg-white/16"
              >
                <CloseIcon className="size-5" />
              </Drawer.Close>
            </div>
            <nav aria-label="Админ панел" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <AdminNavList groups={groups} onNavigate={onNavigate} />
            </nav>
            <div className="shrink-0 border-t border-white/8 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <AdminAccountCard account={account} onNavigate={onNavigate} />
            </div>
          </Drawer.Content>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}
