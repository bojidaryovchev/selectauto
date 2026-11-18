"use client"; // Error boundaries must be Client Components

import { Suspense, useEffect } from "react";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { ErrorPanel } from "@/components/status";

/**
 * A public page that throws (a failed query, a bug) renders this inside the root layout, with the header and footer,
 * instead of Next's bare error screen (boards `info-500`, `info-500-flow` 1; parity check docs/design/parity/errors.md).
 * The admin has its own (app/admin/error.tsx). An error in the root layout itself goes to app/global-error.tsx.
 *
 * `retry` re-fetches and re-renders the page. In production a server error's message is withheld from the browser;
 * `digest` is the id to find it by in the server logs. An error boundary can't export metadata, so the title is a
 * React `<title>`. No noindex: an error that a crawler happens to hit must not take a page out of search.
 */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Нещо се обърка — SelectAuto</title>
      {/* The header reads the path, which a prerender may not know, as in not-found.tsx. */}
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 pt-(--header-h)">
        <div className="sa-wrap">
          <ErrorPanel digest={error.digest} onRetry={retry} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
