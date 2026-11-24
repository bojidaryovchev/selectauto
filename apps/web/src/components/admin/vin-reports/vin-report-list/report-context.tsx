import { ExternalLinkIcon, FileTextIcon, InboxIcon } from "@/components/icons";
import { LEAD_TYPE_META } from "@/constants/admin";
import type { VinReportView } from "@/types/vin-report.type";
import Link from "next/link";

/**
 * What a report was for, as links (`.ab-dl`, 40 px tall): the catalog car with its VIN (the site's page, in a new
 * tab), the contract, and the Carfax lead (the inbox filtered to the VIN). „—" when none is known.
 */
export function ReportContext({ report }: { report: VinReportView }) {
  const links: React.ReactNode[] = [];
  if (report.car) {
    links.push(
      <a
        key="car"
        href={`/avtomobil/${report.car.id}`}
        target="_blank"
        rel="noreferrer"
        className="ab-dl hover:underline"
      >
        <ExternalLinkIcon />
        {report.car.title}
      </a>,
    );
  }
  if (report.contract) {
    links.push(
      <Link
        key="contract"
        href={`/admin/dogovori/${report.contract.id}`}
        prefetch={false}
        className="ab-dl hover:underline"
      >
        <FileTextIcon />
        Договор {report.contract.number}
      </Link>,
    );
  }
  if (report.lead) {
    links.push(
      <Link
        key="lead"
        href={`${LEAD_TYPE_META.carfax.href}?q=${report.vin}`}
        prefetch={false}
        className="ab-dl hover:underline"
      >
        <InboxIcon />
        Запитване №{report.lead.id} · {report.lead.name}
      </Link>,
    );
  }
  if (links.length === 0) return <span className="ab-dim">—</span>;
  return <span className="flex flex-col items-start">{links}</span>;
}
