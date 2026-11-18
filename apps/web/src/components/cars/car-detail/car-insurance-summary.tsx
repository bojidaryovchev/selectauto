import { TriangleAlertIcon } from "@/components/icons";
import type { CarInsurance } from "@/types/car-detail.type";

/** Caution flags — only the ones that actually occurred. */
function insuranceFlags(insurance: CarInsurance): string[] {
  const flags: string[] = [];
  if (insurance.totalLossCount > 0) flags.push(`Тотална щета: ${insurance.totalLossCount}`);
  if (insurance.floodCount > 0) flags.push(`Наводнение: ${insurance.floodCount}`);
  if (insurance.theftCount > 0) flags.push(`Кражба: ${insurance.theftCount}`);
  return flags;
}

/** Whether the summary has any signal to show (the page also asks, to point the VIN card's Korean line here). */
export function hasInsuranceSignal(insurance: CarInsurance): boolean {
  const { ownerChanges, accidentCount, myAccidentCost, otherAccidentCost } = insurance;
  return (
    ownerChanges > 0 ||
    accidentCount > 0 ||
    !!myAccidentCost ||
    !!otherAccidentCost ||
    insuranceFlags(insurance).length > 0
  );
}

/**
 * ENCAR insurance / ownership summary (`details.insurance_v2`) — „История на щетите (застраховка)" (boards `cd-korea*`,
 * `cd-states`). Big-number stats (owner changes, insurance events, damage to the car and to third parties), warning
 * tags for total-loss / flood / theft records, and the dated events with their cost. Money is approximate USD,
 * converted from raw KRW in the mapper. Present on ~94% of active ENCAR lots. Renders nothing when there's no signal.
 */
export function CarInsuranceSummary({ insurance, id }: { insurance: CarInsurance; id?: string }) {
  if (!hasInsuranceSignal(insurance)) return null;
  const { ownerChanges, accidentCount, myAccidentCost, otherAccidentCost, accidents } = insurance;
  const flags = insuranceFlags(insurance);

  return (
    <section id={id} className="sa-pnl scroll-mt-[calc(var(--header-h)+16px)]">
      <div className="sa-pnl__h">
        <h2 className="sa-pnl__t">История на щетите (застраховка)</h2>
      </div>

      <div className="cd-stats">
        <div className="sa-stat">
          <b>{ownerChanges}</b>
          <span>Смяна на собственик</span>
        </div>
        <div className={`sa-stat ${accidentCount > 0 ? "is-warn" : ""}`}>
          <b>{accidentCount}</b>
          <span>Застрахователни събития</span>
        </div>
        {myAccidentCost ? (
          <div className="sa-stat is-warn">
            <b>{myAccidentCost}</b>
            <span>Щети по автомобила</span>
          </div>
        ) : null}
        {otherAccidentCost ? (
          <div className="sa-stat">
            <b>{otherAccidentCost}</b>
            <span>Щети по трети лица</span>
          </div>
        ) : null}
      </div>

      {flags.length > 0 ? (
        <div className="cd-chips mt-3.5">
          {flags.map((f) => (
            <span key={f} className="sa-tag sa-tag--lg sa-tag--neg">
              <TriangleAlertIcon />
              {f}
            </span>
          ))}
        </div>
      ) : null}

      {accidents.length > 0 ? (
        <>
          <span className="cd-sub">Регистрирани събития</span>
          <ul className="cd-ev">
            {accidents.map((a, i) => (
              <li key={i}>
                <span>{a.date ?? "—"}</span>
                <b>{a.cost ?? "—"}</b>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
