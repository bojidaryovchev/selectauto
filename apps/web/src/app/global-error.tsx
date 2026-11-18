"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Logo } from "@/components/common/logo";
import { ErrorPanel } from "@/components/status";
import { FONT_VARIABLES } from "@/styles/fonts";
import "./globals.css";

/**
 * An error in the root layout itself (board `info-500-flow` 2; parity check docs/design/parity/errors.md). This file
 * replaces the layout, so it renders its own document with the site's styles and fonts, and none of what the layout
 * provides: no header, tabs, footer or session. Only the logo bar, then „Нещо се обърка". The logo and „Към началото"
 * load the home page in full, since a client navigation would render the failed layout again.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="bg" className={`${FONT_VARIABLES} h-full`}>
      <body className="flex min-h-full flex-col">
        <title>Нещо се обърка — SelectAuto</title>
        <header className="flex h-14 flex-none items-center border-b border-hair px-gutter">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load on purpose, see above */}
          <a href="/" className="flex">
            <Logo size="bar" />
          </a>
        </header>
        <main className="flex flex-1 flex-col">
          <div className="sa-wrap flex flex-1 flex-col justify-center">
            <ErrorPanel digest={error.digest} onRetry={retry} documentLink />
          </div>
        </main>
      </body>
    </html>
  );
}
