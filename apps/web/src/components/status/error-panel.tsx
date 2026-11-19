"use client";

import { Button } from "@/components/common/button";
import { buttonClasses } from "@/components/common/button-variants";
import { LinkButton } from "@/components/common/link-button";
import { RotateCcwIcon, TriangleAlertIcon } from "@/components/icons";

/**
 * „Нещо се обърка" (boards `info-500`, `info-500-flow`; parity check docs/design/parity/errors.md): the content of
 * app/error.tsx and app/global-error.tsx. The words are app/admin/error.tsx's, the button formal. „Код:" shows only
 * when the error has a digest, the id of a server error in the server logs; an error thrown in the browser has none.
 *
 * `documentLink` makes „Към началото" a full page load: under global-error the root layout is what failed, so a
 * client navigation would render it again.
 */
export function ErrorPanel({
  digest,
  onRetry,
  documentLink = false,
}: {
  digest?: string;
  onRetry: () => void;
  documentLink?: boolean;
}) {
  const home = "max-sm:w-full";
  return (
    <div
      role="alert"
      className="flex min-h-130 max-w-190 flex-col items-start justify-center gap-4.5 py-[clamp(64px,9vw,140px)]"
    >
      <span
        aria-hidden="true"
        className="mb-1.5 grid size-18 place-items-center rounded-full bg-warn-w text-warn [&_svg]:size-8"
      >
        <TriangleAlertIcon />
      </span>
      <h1 className="type-h1">Нещо се обърка</h1>
      <p className="sa-lead">
        Страницата не успя да се зареди. Опитайте отново; ако грешката се повтаря, изпратете кода по-долу на
        поддръжката.
      </p>
      {digest ? (
        <p className="flex flex-wrap items-center gap-2 text-sm/normal font-semibold wrap-anywhere text-tx3">
          Код:{" "}
          <span className="inline-flex min-h-6.5 items-center rounded-sm bg-tint/3 px-2.5 py-0.5 text-[13px] leading-[1.4] font-semibold text-tx2 shadow-[inset_0_0_0_1px_var(--color-hair2)]">
            {digest}
          </span>
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-3 max-sm:w-full max-sm:flex-col">
        <Button variant="pri" size="xl" onClick={() => onRetry()} className={home}>
          <RotateCcwIcon />
          Опитайте отново
        </Button>
        {documentLink ? (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load on purpose, see above
          <a href="/" className={`${buttonClasses({ variant: "sec", size: "xl" })} ${home}`}>
            Към началото
          </a>
        ) : (
          <LinkButton href="/" variant="sec" size="xl" className={home}>
            Към началото
          </LinkButton>
        )}
      </div>
    </div>
  );
}
