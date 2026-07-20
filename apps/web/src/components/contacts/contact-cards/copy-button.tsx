"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckIcon, CopyIcon } from "@/components/icons";

/**
 * Copies `value` to the clipboard, fires a top-right success toast, and swaps its
 * icon to a check for ~1.4s. Semantic `<button type="button">` with an aria-label
 * built from `label` (the copy buttons sit next to phone/email/address on the
 * contacts page). A brand-tinted ripple expands from the button on click. Each
 * button owns its own state and reuses the app's single react-hot-toast <Toaster>.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [ripple, setRipple] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async () => {
    // Retrigger the ripple even on rapid repeated clicks.
    setRipple(false);
    requestAnimationFrame(() => setRipple(true));

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Копирано: ${value}`);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can reject on insecure origins or denied permission.
      toast.error("Копирането не бе успешно");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Копирай ${label}`}
      title={`Копирай ${label}`}
      className="relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-line bg-white px-3 py-2 text-xs font-extrabold text-[#5a5d64] transition-colors duration-150 hover:border-brand/40 hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.97]"
    >
      {ripple && (
        <span
          aria-hidden="true"
          onAnimationEnd={() => setRipple(false)}
          className="pointer-events-none absolute inset-0 animate-[ping_0.6s_ease-out] rounded-full bg-brand/15"
        />
      )}
      {copied ? (
        <CheckIcon className="size-3.5 text-brand" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
      <span className="relative">{copied ? "Копирано" : "Копирай"}</span>
    </button>
  );
}
