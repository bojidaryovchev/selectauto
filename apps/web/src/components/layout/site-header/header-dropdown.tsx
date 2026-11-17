"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import {
  BuildingIcon,
  CalculatorIcon,
  ChevronDownIcon,
  FileSearchIcon,
  FlagCaIcon,
  FlagKrIcon,
  FlagUsIcon,
  ListChecksIcon,
  MessageIcon,
  NotebookTextIcon,
  PercentIcon,
  ShieldCheckIcon,
  StarOutlineIcon,
  WalletIcon,
} from "@/components/icons";
import type { NavItem } from "@/types/nav.type";

type Icon = ComponentType<{ className?: string }>;

/** The import hubs carry their country's flag in the menu (board `ac-hdr`, state 3). */
const FLAGS: Record<string, Icon> = {
  "/vnos-na-koli-ot-korea": FlagKrIcon,
  "/vnos-na-koli-ot-sasht": FlagUsIcon,
  "/vnos-na-koli-ot-kanada": FlagCaIcon,
};

/** Every other page in a menu has its icon (board `ac-hdr`, states 4–5). */
const ICONS: Record<string, Icon> = {
  "/kalkulator": CalculatorIcon,
  "/lizingov-kalkulator": PercentIcon,
  "/byudzheten-kalkulator": WalletIcon,
  "/proverka-vin": FileSearchIcon,
  "/carfax": ShieldCheckIcon,
  "/za-nas": BuildingIcon,
  "/proces": ListChecksIcon,
  "/otzivi": StarOutlineIcon,
  "/chesto-zadavani-vaprosi": MessageIcon,
  "/blog": NotebookTextIcon,
};

/**
 * One desktop header item with a dropdown (Внос, Инструменти, За нас). It opens on hover, on keyboard focus and on a
 * press (board `ac-hdr`, states 3–5):
 *
 * - The parent stays a link to its first page, as it always was (a site-wide anchor to that page).
 * - With a mouse, hovering opens the menu and a click follows the link.
 * - On a touch screen, the first tap opens the menu and the next one follows the link.
 * - With a keyboard, focusing the parent opens it; Tab walks the rows; Esc closes it and returns focus to the parent.
 *
 * The rows stay in the DOM while closed, only hidden, so crawlers still reach every page.
 */
export function HeaderDropdown({
  item,
  active,
  isActivePath,
  painted,
}: {
  item: NavItem & { children: NonNullable<NavItem["children"]> };
  /** One of the item's pages is the current page. */
  active: boolean;
  isActivePath: (href: string) => boolean;
  /** No route prefetch until the page has painted (see useHasPainted). */
  painted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLAnchorElement | null>(null);
  const lastPointer = useRef<string>("mouse");
  // Whether the menu was open when the press began. A tap also fires the emulated mouseenter, which opens the menu
  // before the click arrives, so the click must look at the state from before the tap.
  const openAtPress = useRef(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      parentRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="sa-hdr__nav flex-none">
        <Link
          ref={parentRef}
          href={item.href}
          prefetch={painted ? undefined : false}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={menuId}
          className={`${active ? "is-on" : ""} ${open ? "bg-s2" : ""}`}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType;
            openAtPress.current = open;
          }}
          onClick={(e) => {
            if (lastPointer.current === "touch" && !openAtPress.current) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {item.label}
          <ChevronDownIcon className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </Link>
      </div>

      {/* The padding bridges the gap under the parent, so the pointer can travel to the rows without closing it. */}
      <div
        className={`absolute left-0 top-full z-60 pt-3.5 transition-[opacity,visibility] duration-150 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div id={menuId} role="menu" aria-label={item.label} className="sa-dd static">
          {item.children.map((sub) => {
            const Flag = FLAGS[sub.href];
            const RowIcon = ICONS[sub.href];
            const current = isActivePath(sub.href);
            return (
              <Link
                key={sub.href}
                href={sub.href}
                role="menuitem"
                prefetch={painted ? undefined : false}
                aria-current={current ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {Flag ? <Flag className="sa-flag" /> : null}
                {RowIcon ? <RowIcon className="size-4.5 flex-none text-tx2" /> : null}
                {sub.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
