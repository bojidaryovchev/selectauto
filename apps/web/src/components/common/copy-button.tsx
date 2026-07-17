"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckIcon, CopyIcon } from "@/components/icons";

/**
 * Compact inline copy-to-clipboard button for a single value (VIN, lot №, …).
 * Copies `value`, fires a top-right success toast (reusing the app-wide
 * <Toaster>), and flips its icon to a check for ~1.4s. `label` builds the
 * aria-label/title ("Копирай VIN"). Icon-only — sized to sit beside a spec value.
 *
 * A generic sibling of the contacts page's bespoke pill copy-button: this one is
 * the small, value-agnostic primitive that belongs in `common/`.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async () => {
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
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-white text-muted transition-colors duration-150 hover:border-brand/40 hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.95]"
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-brand" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}
