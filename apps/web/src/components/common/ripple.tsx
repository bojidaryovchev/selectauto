"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface RippleData {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface Props {
  theme?: "dark" | "light";
  className?: string;
}

/**
 * Material-style click ripple. Renders an absolutely-positioned overlay that
 * fills its nearest positioned ancestor and listens on that ancestor (the
 * parent button/anchor) for pointer + keyboard (Space/Enter) activation,
 * spawning a circle from the activation point. The keyframe lives in
 * globals.css (`animate-ripple-effect`) and is disabled under reduced-motion.
 *
 * The host element must be `relative` + `overflow-hidden`. The `Button` /
 * `LinkButton` primitives in this folder wire all of that up; drop a bare
 * `<Ripple />` in only when adding it to a hand-rolled interactive element.
 *
 * `theme` picks the ripple tint: "dark" (default) for light-surfaced buttons,
 * "light" for dark/coloured surfaces.
 *
 * Exactly one ripple per primary activation: `pointerdown` fires once per
 * pointer and per mouse button, so we ignore everything but the primary button
 * of the primary pointer — otherwise a multi-touch gesture (or a right/middle
 * click) would spawn one ripple per contact and you'd see several at once. Each
 * ripple removes itself on `animationend` (tied to the real animation, no timer
 * to drift), and any in-flight ripples are dropped on unmount so nothing leaks
 * across StrictMode remounts, HMR, or reconciliation.
 */
const Ripple: React.FC<Props> = ({ theme = "dark", className = "" }) => {
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const removeRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Listen to keyboard and pointer events on the parent element (the button/anchor).
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const spawn = (x: number, y: number, size: number) => {
      // Skip entirely under reduced-motion: the keyframe is disabled there, so
      // the node would never fire `animationend` and would linger in the DOM.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id, x, y, size }]);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore the repeated events fired while a key is held down.
      if (event.repeat) return;
      if (event.key !== " " && event.key !== "Enter") return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      // Center the ripple for keyboard activation.
      spawn((rect.width - size) / 2, (rect.height - size) / 2, size);
    };

    const handlePointerDown = (event: PointerEvent) => {
      // Only the primary button of the primary pointer spawns a ripple. This
      // stops a right/middle click and every secondary finger of a multi-touch
      // gesture from each adding their own circle (the "N ripples at once").
      if (event.button !== 0 || !event.isPrimary) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      spawn(event.clientX - rect.left - size / 2, event.clientY - rect.top - size / 2, size);
    };

    parent.addEventListener("keydown", handleKeyDown);
    parent.addEventListener("pointerdown", handlePointerDown);
    return () => {
      parent.removeEventListener("keydown", handleKeyDown);
      parent.removeEventListener("pointerdown", handlePointerDown);
      // Drop any in-flight ripples so none leak across unmount / HMR.
      setRipples([]);
    };
  }, []);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} ref={containerRef} aria-hidden="true">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          onAnimationEnd={() => removeRipple(ripple.id)}
          style={{
            backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)",
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
          className="animate-ripple-effect pointer-events-none absolute rounded-[50%] [animation-fill-mode:forwards]"
        ></div>
      ))}
    </div>
  );
};

export { Ripple };
