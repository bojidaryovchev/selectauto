import { ContractForm } from "@/components/admin/contracts";
import { listClients } from "@/queries/clients";
import { listAvailableDeposits } from "@/queries/deposits";

/**
 * /admin/dogovori/nov — the contract-creation wizard (spec §3/§11.1): type,
 * client (existing or new, with the paid-deposit offer per §14.1), car and the
 * five financial points with a live total. Saving mints the number and creates
 * the four payment stages in one transaction. The layout gates the route.
 */
export default async function AdminNewContractPage() {
  const [clients, deposits] = await Promise.all([listClients(), listAvailableDeposits()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Нов договор за посредничество</h1>
        <p className="max-w-2xl text-sm text-muted">
          Всички данни се въвеждат еднократно тук. При запазване системата генерира номер, създава четирите етапа на
          плащане и (по избор) приспада платен депозит от плащане „Кола“.
        </p>
      </div>
      <ContractForm clients={clients} deposits={deposits} />
    </div>
  );
}
