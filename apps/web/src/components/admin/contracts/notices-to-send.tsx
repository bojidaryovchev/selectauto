import { adminButtonClass } from "@/components/admin/ui";
import { ChevronDownIcon } from "@/components/icons";
import { stageLabel, type ContractMarket, type PaymentStage } from "@/constants/contracts";
import { formatSofiaDate } from "@/lib/sofia-time";
import type { NoticeToSendRow } from "@/queries/contracts";
import Link from "next/link";
import { NoticeSentButton } from "./notice-sent-button";

/**
 * The „за изпращане" queue above the register: issued notices nobody has marked
 * as forwarded to the client yet. Open by default for whoever forwards them
 * (`notices.markSent`), whose work list it is; folded for the one who issues
 * them, who only follows it — so the register isn't pushed a screen down.
 */
export function NoticesToSend({ notices, canMarkSent }: { notices: NoticeToSendRow[]; canMarkSent: boolean }) {
  return (
    <details open={canMarkSent} className="group rounded-xl border border-amber-300 bg-amber-50">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 text-sm font-black text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        Известия за изпращане към клиента ({notices.length})
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="m-0 flex list-none flex-col divide-y divide-amber-200 border-t border-amber-200 px-4 py-1">
        {notices.map((n) => (
          <li key={n.documentId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              {/* Padding grows the tap target to 40 px; the negative margin keeps the line where it was. */}
              <Link
                href={`/admin/dogovori/${n.contractId}`}
                className="-my-2.5 inline-block py-2.5 font-bold text-brand hover:underline"
              >
                Договор № {n.contractNumber}
              </Link>
              <p className="wrap-anywhere text-ink">
                {n.clientName} · {stageLabel(n.market as ContractMarket, n.stage as PaymentStage)} · версия {n.version}{" "}
                от {formatSofiaDate(n.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <a
                href={`/api/payment-document/${n.documentId}`}
                target="_blank"
                rel="noreferrer"
                className={adminButtonClass("secondary")}
              >
                PDF ⬇
              </a>
              {canMarkSent ? <NoticeSentButton documentId={n.documentId} /> : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
