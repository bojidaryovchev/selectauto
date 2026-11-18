"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckIcon, CopyIcon } from "@/components/icons";

/**
 * „Копирайте" beside a phone, the address or the e-mail on the contacts page (boards `in-kontakti`,
 * `in-kontakti-spec`): copies `value`, shows a notification („Копирано: {value}", or „Копирането не бе успешно"),
 * and turns to a tick and „Копирано" for ~1,4 s. On a phone it is a 44 px icon button; its name stays
 * „Копирайте {label}".
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
      aria-label={`Копирайте ${label}`}
      title={`Копирайте ${label}`}
      className={`sa-btn sa-btn--sec sa-btn--md in-copy ${copied ? "is-done" : ""}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span className="in-copy__t">{copied ? "Копирано" : "Копирайте"}</span>
    </button>
  );
}
