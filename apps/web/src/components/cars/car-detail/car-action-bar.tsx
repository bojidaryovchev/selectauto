"use client";

import { useEffect, useState } from "react";
import { LinkButton, buttonClasses } from "@/components/common";
import { AuctionCountdown } from "@/components/cars/all-cars/auction-countdown";
import { PhoneIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { CONTACT } from "@/constants";
import type { CarDetailPrice } from "@/types/car-detail.type";
import type { InquiryPrefill } from "@/types";

/**
 * The action bar on phones and tablets (boards `cd-*`, `cd-f-bar`): fixed above the bottom tabs below 1024 px, where
 * the buy box no longer sits beside the details (the kit hides it from 1024 px).
 *
 * - Active car: the main price, or without one the countdown to the sale (or the status), then „Направете заявка"
 *   and the call as an orange icon button „Обадете се" — the contact panel's actions within reach, the phone still
 *   the main one (owner decision 13).
 * - Sold car: „Продаден за" with the price and „Вижте активни обяви" (full width when there's no price).
 *
 * It hides while what it repeats is on screen — the contact panel, or a sold car's „Вижте активни обяви" (README,
 * bars) — and leaves the tab order then (`inert`). When the bottom tabs hide on scroll down it slides down to the
 * screen's edge with them (SiteHeader marks `<html data-bars-hidden>`); its bottom padding covers the iPhone's home
 * indicator there, and sits behind the tabs otherwise. While it shows (`is-on`), the back-to-top button and the
 * notifications move up above it (globals.css, `--page-bar`), and a spacer after the footer keeps the page's end
 * reachable (`.cd-barsp`, page.tsx).
 */
export function CarActionBar({
  watchId,
  price,
  past,
  activeHref,
  saleDate,
  status,
  prefill,
}: {
  /** The element the bar repeats: while it is on screen, the bar hides. */
  watchId: string;
  /** The main price row (label and value), when the car has one. */
  price?: CarDetailPrice;
  past: boolean;
  /** A sold car's „Вижте активни обяви" target. */
  activeHref: string;
  saleDate?: string;
  status?: string;
  /** The inquiry's car (as the contact panel's). */
  prefill?: InquiryPrefill;
}) {
  const [targetInView, setTargetInView] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetInView(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  const shown = !targetInView;

  return (
    <div
      inert={!shown}
      className={`sa-bar cd-bar pb-[calc(10px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none ${
        shown
          ? "is-on [:root[data-bars-hidden]_&]:translate-y-(--bottom-nav)"
          : "translate-y-[calc(100%+var(--bottom-nav))]"
      }`}
    >
      {past ? (
        <>
          {price ? (
            <div>
              <small>{price.label}</small>
              <b>{price.value}</b>
            </div>
          ) : null}
          <LinkButton href={activeHref} variant="pri" size="md" block={!price}>
            Вижте активни обяви
          </LinkButton>
        </>
      ) : (
        <>
          <div>
            {price ? (
              <>
                <small>{price.label}</small>
                <b>{price.value}</b>
              </>
            ) : (
              <AuctionCountdown saleDate={saleDate} status={status} labelAs="small" compact />
            )}
          </div>
          <InquiryButton prefill={prefill} variant="sec" size="md">
            Направете заявка
          </InquiryButton>
          <a href={CONTACT.phoneHref} aria-label="Обадете се" className={`${buttonClasses({ variant: "pri", size: "md" })} cd-call`}>
            <PhoneIcon />
          </a>
        </>
      )}
    </div>
  );
}
