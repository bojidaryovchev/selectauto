import { buttonClasses } from "@/components/common/button-variants";
import { ChevronDownIcon, DownloadIcon, SendIcon } from "@/components/icons";
import { stageLabel, type ContractMarket, type PaymentStage } from "@/constants/contracts";
import { formatSofiaDate } from "@/lib/sofia-time";
import type { NoticeToSendRow } from "@/queries/contracts";
import Link from "next/link";
import { NoticeSentButton } from "./notice-sent-button";

/**
 * The „за изпращане" queue above the register (`ab-send`; boards `ab-contracts`, `ab-contracts-sup`,
 * `ab-contracts-states`): issued notices nobody has marked as forwarded to the client yet. Open by default for whoever
 * forwards them (`notices.markSent`), whose work list it is; folded for the one who issues them, who only follows it —
 * so the register isn't pushed a screen down.
 */
export function NoticesToSend({ notices, canMarkSent }: { notices: NoticeToSendRow[]; canMarkSent: boolean }) {
  return (
    <details open={canMarkSent} className="ab-send">
      <summary>
        <span>
          <SendIcon />
          Известия за изпращане към клиента ({notices.length})
        </span>
        <ChevronDownIcon />
      </summary>
      <ul>
        {notices.map((n) => (
          <li key={n.documentId}>
            <div>
              <Link href={`/admin/dogovori/${n.contractId}`} className="ab-link">
                Договор № {n.contractNumber}
              </Link>
              <p>
                {n.clientName} · {stageLabel(n.market as ContractMarket, n.stage as PaymentStage)} · версия {n.version}{" "}
                от {formatSofiaDate(n.createdAt)}
              </p>
            </div>
            <div className="ab-send__a">
              <a
                href={`/api/payment-document/${n.documentId}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "sec", size: "md" })}
              >
                <DownloadIcon />
                PDF
              </a>
              {canMarkSent ? <NoticeSentButton documentId={n.documentId} /> : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
