import { ContractForm } from "@/components/admin/contracts";
import { AdminPageHeader } from "@/components/admin/ui";
import { requirePageWith } from "@/lib/admin";
import { listClients } from "@/queries/clients";
import { listAvailableDeposits } from "@/queries/deposits";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Нов договор" };

/**
 * /admin/dogovori/nov — the contract-creation wizard (spec §3/§11.1): type,
 * client (existing or new, with the paid-deposit offer per §14.1), car and the
 * market's пера with a live total. Saving mints the number and creates the
 * market's payment stages (2–4) in one transaction. Needs `contracts.create`.
 */
export default async function AdminNewContractPage() {
  await requirePageWith("contracts.create");
  const [clients, deposits] = await Promise.all([listClients(), listAvailableDeposits()]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        back={{ href: "/admin/dogovori", label: "Всички договори" }}
        title="Нов договор"
        description="Всички данни се въвеждат еднократно тук. При запазване системата генерира номер, създава етапите на плащане и (по избор) приспада платен депозит от плащане „Кола“."
      />
      <ContractForm clients={clients} deposits={deposits} />
    </div>
  );
}
