"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { IconButton } from "./icon-button";

/**
 * Compact inline copy-to-clipboard button for a single value (VIN, lot №, …; boards `cd-*`, `cd-f-fav`). Copies
 * `value`, shows a notification („Копирано: {value}", or „Копирането не бе успешно"), and flips its icon to a tick for
 * ~1,4 s. `label` builds the name: „Копирайте {label}". Icon-only — sized by the kit to sit beside a value (`.sa-kv`).
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
    <IconButton label={`Копирайте ${label}`} title={`Копирайте ${label}`} onClick={handleClick}>
      {copied ? <CheckIcon className="text-pos" /> : <CopyIcon />}
    </IconButton>
  );
}
