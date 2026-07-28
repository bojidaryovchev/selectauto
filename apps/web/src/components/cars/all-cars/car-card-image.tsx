"use client";

import { useCallback, useState } from "react";

/**
 * The listing card's photo.
 *
 * A plain `<img>` served DIRECTLY from the source CDN — no bake, no Vercel
 * optimizer (see next.config.ts: per-car transformations dominated the bill, so
 * car photos were deliberately taken off the optimizer; an `unoptimized`
 * next/image would be this element plus extra weight).
 *
 * This is the ONE piece of the card that must be a client component, and only
 * because of `fallback`: for Copart listings `src` is DERIVED — the stored
 * `_thb.jpg` thumbnail (144×108, far too small for a 305–490px card slot)
 * rewritten to its `_ful.jpg` sibling (960×720). That sibling existed for
 * 491/491 assets sampled across the table, but it is inferred from the URL
 * rather than returned by the API, so a miss must degrade to the stored
 * `image_url` copy instead of leaving a broken card. `fallback` is null for
 * every non-rewritten card — i.e. most of them — and those render with no error
 * handler at all.
 *
 * `priority` marks the above-the-fold LCP candidates: they eager-load at high
 * fetch priority; everything else lazy-loads as it virtualizes into view.
 */
export function CarCardImage({
  src,
  fallback,
  alt,
  priority = false,
}: {
  src: string;
  fallback?: string | null;
  alt: string;
  priority?: boolean;
}) {
  const hasFallback = !!fallback && fallback !== src;
  const [failed, setFailed] = useState(false);
  const shown = failed && hasFallback ? fallback! : src;

  /**
   * An image that 404s while the SSR HTML is loading fires its error event
   * BEFORE hydration attaches `onError`, and React never replays it — the card
   * would sit broken forever. So probe the node once on mount: a load that has
   * FINISHED (`complete`) with zero `naturalWidth` is a failed load.
   *
   * Depends only on the boolean, not on `fallback` itself, so the identity is
   * stable across re-renders of a card. Swapping `src` patches the same DOM
   * node, so this never re-runs and can't loop; a fallback that also fails just
   * re-sets `failed` to the value it already has.
   */
  const probe = useCallback(
    (node: HTMLImageElement | null) => {
      if (!hasFallback || !node) return;
      if (node.complete && node.naturalWidth === 0) setFailed(true);
    },
    [hasFallback],
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={probe}
      src={shown}
      alt={alt}
      width={400}
      height={260}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={hasFallback ? () => setFailed(true) : undefined}
      className="block aspect-40/26 w-full object-cover"
    />
  );
}
