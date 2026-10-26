"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

/**
 * A page that throws (a failed query, a bug) renders this inside the admin
 * shell, with the navigation still usable — instead of Next's bare error
 * screen. `retry` re-fetches and re-renders the page. In production the message
 * of a server error is withheld from the browser; `digest` is the id to look
 * the error up by in the server logs.
 */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="rounded-xl border border-line bg-white p-6">
      <h1 className="text-2xl font-black tracking-tight text-ink">Нещо се обърка</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Страницата не успя да се зареди. Опитайте отново; ако грешката се повтаря, изпратете кода по-долу на
        поддръжката.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs break-all text-muted">Код: {error.digest}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Опитай отново
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition-colors hover:bg-neutral-50"
        >
          Към началото
        </Link>
      </div>
    </div>
  );
}
