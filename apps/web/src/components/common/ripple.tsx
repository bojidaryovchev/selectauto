"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface RippleData {
  id: number;
  x: number;
  y: number;
  size: number;
}

const RIPPLE_DURATION_MS = 1000;

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
 */
const Ripple: React.FC<Props> = ({ theme = "dark", className = "" }) => {
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const createRipple = useCallback((x: number, y: number, size: number) => {
    const id = rippleIdRef.current++;
    const newRipple: RippleData = { id, x, y, size };
    setRipples((prevRipples) => [...prevRipples, newRipple]);

    // Remove this specific ripple after its animation completes.
    setTimeout(() => {
      if (isMountedRef.current) {
        setRipples((prevRipples) => prevRipples.filter((r) => r.id !== id));
      }
    }, RIPPLE_DURATION_MS);
  }, []);

  // Listen to keyboard and pointer events on the parent element (the button/anchor).
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore the repeated events fired while a key is held down.
      if (event.repeat) return;

      const container = containerRef.current;
      if (!container) return;

      if (event.key === " " || event.key === "Enter") {
        const rect = container.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        // Center the ripple for keyboard activation.
        const x = (rect.width - size) / 2;
        const y = (rect.height - size) / 2;
        createRipple(x, y, size);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      createRipple(x, y, size);
    };

    parent.addEventListener("keydown", handleKeyDown);
    parent.addEventListener("pointerdown", handlePointerDown);
    return () => {
      parent.removeEventListener("keydown", handleKeyDown);
      parent.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [createRipple]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} ref={containerRef} aria-hidden="true">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
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
