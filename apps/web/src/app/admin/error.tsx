"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/common";
import { RotateCcwIcon, TriangleAlertIcon } from "@/components/icons";

/**
 * A page that throws (a failed query, a bug) renders this inside the admin
 * shell, with the navigation still usable — instead of Next's bare error
 * screen (boards `ad-error`, `ad-error-states`; parity check docs/design/parity/admin-shell.md). `retry` re-fetches
 * and re-renders the page. In production the message of a server error is withheld from the browser; `digest` is
 * the id to look the error up by in the server logs, shown only when there is one.
 */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="sa-pnl bo-err">
      <span className="bo-err__ic" aria-hidden="true">
        <TriangleAlertIcon />
      </span>
      <h1 className="bo-h1">Нещо се обърка</h1>
      <p className="bo-ph__d">
        Страницата не успя да се зареди. Опитайте отново; ако грешката се повтаря, изпратете кода по-долу на
        поддръжката.
      </p>
      {error.digest ? (
        <p className="bo-code">
          Код: <span className="sa-mono bo-codev">{error.digest}</span>
        </p>
      ) : null}
      <div className="bo-err__act">
        <Button variant="pri" size="md" className="bo-wph" onClick={() => retry()}>
          <RotateCcwIcon />
          Опитайте отново
        </Button>
        <LinkButton href="/admin" variant="sec" size="md" className="bo-wph">
          Към началото
        </LinkButton>
      </div>
    </div>
  );
}
