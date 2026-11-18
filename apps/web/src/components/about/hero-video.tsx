"use client";

import { useState, useSyncExternalStore } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { CanvasVideo } from "./canvas-video";
import { ABOUT_VIDEO_POSTER, ABOUT_VIDEO_SRC } from "./media";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * The about hero's video (board `in-za-nas`): the muted loop behind the copy and, at the hero's top right, the
 * control that stops it („Спрете видеото") and starts it again („Пуснете видеото"). Under reduced motion it starts
 * stopped on its poster. Until the user presses the control, it follows that setting.
 */
export function HeroVideo() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reduced;

  return (
    <>
      <div className="in-vh__media">
        <CanvasVideo src={ABOUT_VIDEO_SRC} poster={ABOUT_VIDEO_POSTER} paused={paused} />
      </div>
      <button
        type="button"
        className="sa-ib sa-ib--over in-play"
        aria-label={paused ? "Пуснете видеото" : "Спрете видеото"}
        onClick={() => setUserPaused(!paused)}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </>
  );
}
