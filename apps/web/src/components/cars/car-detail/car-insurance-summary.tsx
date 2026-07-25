import { AlertIcon } from "@/components/icons";
import type { CarInsurance } from "@/types/car-detail.type";

/** A big-number stat card (label under a coloured value). */
function Stat({ value, label, tone = "ink" }: { value: string; label: string; tone?: "ink" | "brand" | "warn" }) {
  const color = tone === "brand" ? "text-brand" : tone === "warn" ? "text-[#c2410c]" : "text-ink";
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f7f8fa] px-4 py-5 text-center ring-1 ring-line">
      <span className={`text-xl font-black tabular-nums sm:text-2xl ${color}`}>{value}</span>
      <span className="mt-1 text-xs/tight font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

/**
 * ENCAR insurance / ownership summary (`details.insurance_v2`) — the "История на
 * щетите (застраховка)" section. Headline stat cards (owner changes, insurance damage
 * cost) plus caution badges for total-loss / flood / theft records, and the per-event
 * accident list when present. Money is approximate USD, converted from raw KRW in the
 * mapper. Present on ~94% of active ENCAR lots. Renders nothing when there's no signal.
 */
export function CarInsuranceSummary({ insurance }: { insurance: CarInsurance }) {
  const { ownerChanges, accidentCount, myAccidentCost, otherAccidentCost, accidents } = insurance;

  // Caution flags — only the ones that actually occurred.
  const flags: string[] = [];
  if (insurance.totalLossCount > 0) flags.push(`Тотална щета: ${insurance.totalLossCount}`);
  if (insurance.floodCount > 0) flags.push(`Наводнение: ${insurance.floodCount}`);
  if (insurance.theftCount > 0) flags.push(`Кражба: ${insurance.theftCount}`);

  const hasSignal = ownerChanges > 0 || accidentCount > 0 || !!myAccidentCost || !!otherAccidentCost || flags.length > 0;
  if (!hasSignal) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <h2 className="mb-5 text-lg font-black uppercase tracking-tight text-ink">
        История на щетите (застраховка)
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={String(ownerChanges)} label="Смяна на собственик" tone="brand" />
        <Stat value={String(accidentCount)} label="Застрахователни събития" tone={accidentCount > 0 ? "warn" : "ink"} />
        {myAccidentCost ? <Stat value={myAccidentCost} label="Щети по автомобила" tone="warn" /> : null}
        {otherAccidentCost ? <Stat value={otherAccidentCost} label="Щети по трети лица" tone="ink" /> : null}
      </div>

      {flags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {flags.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecec] px-3 py-1 text-[12px] font-bold text-[#b91c1c] ring-1 ring-[#f3c9c9]"
            >
              <AlertIcon className="size-3.5" />
              {f}
            </span>
          ))}
        </div>
      ) : null}

      {accidents.length > 0 ? (
        <div className="mt-5">
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-muted">
            Регистрирани събития
          </span>
          <ul className="divide-y divide-line/70 rounded-xl bg-[#f7f8fa] px-4 ring-1 ring-line">
            {accidents.map((a, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <span className="font-semibold text-ink">{a.date ?? "—"}</span>
                <span className="font-bold text-[#c2410c]">{a.cost ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
