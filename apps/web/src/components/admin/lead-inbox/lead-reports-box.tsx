"use client";

import { AdminButtonLink } from "@/components/admin/ui";
import { SendReportDialog, VinReportFiles, VinReportTags } from "@/components/admin/vin-reports";
import { Button } from "@/components/common";
import { SendIcon } from "@/components/icons";
import type { LeadVinReport, LeadVinReports } from "@/types/admin.type";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * A Carfax lead's reports, in its drawer (`.bo-box`): every Carfax / AutoCheck report bought for its VIN with its
 * files, when each was e-mailed to this client (and the Поща conversation), „Изпратете на клиента" for a finished
 * report when the lead left an address, and the way to check the VIN and buy one.
 */
export function LeadReportsBox({ data }: { data: LeadVinReports }) {
  const router = useRouter();
  const [sending, setSending] = useState<LeadVinReport | null>(null);
  const email = data.email;

  return (
    <div className="bo-box">
      <p>Отчети Carfax / AutoCheck</p>
      <div className="flex flex-col gap-4">
        {data.items.length === 0 ? (
          <span className="text-sm text-tx2">Още няма купен отчет за този VIN.</span>
        ) : (
          <ul className="flex flex-col gap-4">
            {data.items.map((r) => (
              <li key={r.id} className="flex flex-col items-start gap-1.5">
                <span className="text-sm text-tx">
                  <b>{r.providerLabel}</b> · купен на {r.createdAtText}
                </span>
                <VinReportTags report={r} />
                <VinReportFiles report={r} />
                {r.sentAtText ? (
                  <span className="ab-hint">
                    Изпратен на клиента на {r.sentAtText}
                    {r.sentThreadId ? (
                      <>
                        {" · "}
                        <Link href={`/admin/poshta/${r.sentThreadId}`} prefetch={false} className="ab-link">
                          разговорът в Поща
                        </Link>
                      </>
                    ) : null}
                  </span>
                ) : null}
                {email && r.status === "ready" && r.pdfUrl ? (
                  <Button variant="sec" size="md" onClick={() => setSending(r)}>
                    <SendIcon />
                    {r.sentAtText ? "Изпратете отново" : "Изпратете на клиента"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {!email ? (
          <span className="ab-hint">Клиентът не е оставил имейл — отчетът не може да бъде изпратен оттук.</span>
        ) : null}
        <AdminButtonLink href={data.checkHref} prefetch={false} variant="secondary" className="self-start">
          Проверете VIN и купете отчет
        </AdminButtonLink>
      </div>

      {sending && email ? (
        <SendReportDialog
          key={sending.id}
          open
          onOpenChange={(open) => {
            if (!open) setSending(null);
          }}
          report={{ id: sending.id, providerLabel: sending.providerLabel, vin: sending.vin }}
          lead={{ id: data.leadId, name: data.name, email }}
          vehicle={data.vehicle}
          sentBefore={sending.sentAtText}
          onSent={() => {
            setSending(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
