"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps children in a scroll-reveal container. Mirrors the site's `.sa-reveal`
 * behaviour: hidden until scrolled into view, then fades/slides in once.
 *
 * `as="li"` makes the container the list item itself, for revealing the items of
 * a list: an `<ol>`/`<ul>` may only contain `<li>` children, so a wrapping div
 * around each item breaks the list for assistive tech.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const props = {
    className: `sa-reveal ${className}`,
    style: delay ? { transitionDelay: `${delay}s` } : undefined,
  };
  if (as === "li") {
    return (
      <li ref={ref as React.RefObject<HTMLLIElement | null>} {...props}>
        {children}
      </li>
    );
  }
  return (
    <div ref={ref as React.RefObject<HTMLDivElement | null>} {...props}>
      {children}
    </div>
  );
}
