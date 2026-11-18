"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

export type LegalTocItem = { id: string; num: string; title: string };

/** A section chosen in the list (or named by the address's #), and where the jump left its top once it settled. */
type Choice = { id: string; top: number | null };

/** Records where the jump to a chosen section left it. The jump follows the click, so it is known by the next frame. */
function settle(choice: { current: Choice | null }, id: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (choice.current?.id === id && el) choice.current.top = el.getBoundingClientRect().top;
  });
}

/**
 * A legal page's contents (boards `in-terms`, `in-privacy`, `in-cookies`, `in-legal-flow`): on a desktop a list beside
 * the text that stays in view, the section being read marked; below 1024 px a „Съдържание" button under the top bar
 * that opens the list and closes once a section is chosen.
 *
 * The section being read is the last one whose top has passed the upper quarter of the screen below the place a jump
 * puts it (its scroll-margin-top); at the foot of the page, where the last sections can't scroll that far, the last
 * one. A section chosen in the list stays marked until the page moves away from where the jump left it, so a short
 * section or one at the foot is marked when chosen.
 */
export function LegalToc({ items }: { items: LegalTocItem[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(items[0]?.id ?? "");
  const chosen = useRef<Choice | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const listId = useId();

  // When the list scrolls inside itself, keep the marked section in its view. Only the list moves, never the page.
  useEffect(() => {
    const ol = list.current;
    const link = ol?.querySelector<HTMLElement>("a.is-on");
    if (!ol || !link || ol.scrollHeight <= ol.clientHeight) return;
    const box = ol.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.top < box.top) ol.scrollTop -= box.top - item.top;
    else if (item.bottom > box.bottom) ol.scrollTop += item.bottom - box.bottom;
  }, [active, open]);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const pick = chosen.current;
      if (pick) {
        const el = document.getElementById(pick.id);
        if (el && (pick.top === null || Math.abs(el.getBoundingClientRect().top - pick.top) < 4)) {
          setActive(pick.id);
          return;
        }
        chosen.current = null;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActive(sections[sections.length - 1].id);
        return;
      }
      let current = sections[0].id;
      for (const section of sections) {
        const margin = parseFloat(getComputedStyle(section).scrollMarginTop);
        if (section.getBoundingClientRect().top > margin + (window.innerHeight - margin) / 4) break;
        current = section.id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    // Opened at a section (a link to /…#razdel-N), or the address's # changed in place: that section counts as chosen.
    const named = () => {
      const id = window.location.hash.slice(1);
      if (!sections.some((section) => section.id === id)) return;
      chosen.current = { id, top: null };
      settle(chosen, id);
      schedule();
    };
    named();
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", named);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", named);
    };
  }, [items]);

  const choose = (id: string) => {
    chosen.current = { id, top: null };
    settle(chosen, id);
    setActive(id);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      button.current?.focus();
    }
  };

  return (
    <nav
      aria-label="Съдържание"
      onKeyDown={onKeyDown}
      // Below 1024px the bar follows the top bar: when that hides on scroll down (SiteHeader marks <html
      // data-bars-hidden>), it moves up to the screen's edge with it.
      className={`in-toc top-[calc(var(--header-h)+27px)] transition-[top] duration-300 ease-out motion-reduce:transition-none max-lg:top-[calc(var(--header-h)+8px)] max-lg:[:root[data-bars-hidden]_&]:top-2 ${open ? "is-open" : ""}`}
    >
      <button
        ref={button}
        type="button"
        className="in-toc__btn"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        Съдържание
        <ChevronDownIcon />
      </button>
      <p className="in-toc__h" aria-hidden="true">
        Съдържание
      </p>
      {/* The list scrolls inside itself when the screen is too short for it (a phone on its side, a small laptop):
          the bar is sticky, so a part below the screen's edge could never be reached. A scrolling box clips an outer
          focus ring, so the links' ring is drawn inside. No overscroll-behavior: with `contain`, a wheel over the list
          no longer scrolls the page even when the list fits. */}
      <ol
        ref={list}
        id={listId}
        className="overflow-y-auto [&_a:focus-visible]:-outline-offset-2 max-lg:max-h-[calc(100dvh-var(--header-h)-var(--bottom-nav)-env(safe-area-inset-bottom)-87px)] lg:max-h-[calc(100dvh-var(--header-h)-96px)]"
      >
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={item.id === active ? "is-on" : undefined}
              aria-current={item.id === active ? "true" : undefined}
              onClick={() => choose(item.id)}
            >
              <b>{item.num}</b> {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
