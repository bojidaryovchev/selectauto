import { CircleCheckIcon, TriangleAlertIcon } from "@/components/icons";
import type { CarInspection as CarInspectionData } from "@/types/car-detail.type";
import { FoldOnPhone } from "./fold-on-phone";

/** Whether the inspection carries anything to show (the page also asks, to point the VIN card's Korean line here). */
export function hasInspectionData({ summary, mechanics, panels }: CarInspectionData): boolean {
  return summary.length > 0 || mechanics.length > 0 || panels.length > 0;
}

/**
 * ENCAR state-inspection block (`details.inspect` + `inspect.outer`) — „Технически преглед" (boards `cd-korea-insp`,
 * `cd-states`). Three parts: the accident-summary verdicts (a tick for „Не", a warning for „Да"), the body-panel
 * repair list (or „Непокътната"), and the mechanical checks (each with a green or amber dot and its state). Present on
 * ~35% of active ENCAR lots. Folds behind its title on a phone (owner point 12). Renders nothing when the inspection
 * carries no data.
 */
export function CarInspection({ inspection, id }: { inspection: CarInspectionData; id?: string }) {
  if (!hasInspectionData(inspection)) return null;
  const { summary, mechanics, panels } = inspection;

  return (
    <FoldOnPhone id={id} title="Технически преглед" className="scroll-mt-[calc(var(--header-h)+16px)]">

      {summary.length > 0 ? (
        <div className="cd-chips">
          {summary.map((v) => {
            const bad = v.value === "Да";
            return (
              <span key={v.label} className={`sa-tag sa-tag--lg ${bad ? "sa-tag--warn" : "sa-tag--pos"}`}>
                {bad ? <TriangleAlertIcon /> : <CircleCheckIcon />}
                {v.label}: {v.value}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Body — intact, or the non-original panels */}
      <span className="cd-sub">Каросерия</span>
      {panels.length === 0 ? (
        <div className="cd-chips">
          <span className="sa-tag sa-tag--lg sa-tag--pos">
            <CircleCheckIcon />
            Непокътната
          </span>
        </div>
      ) : (
        <div className="cd-chips">
          {panels.map((p) => (
            <span key={p.label} className="sa-tag sa-tag--lg sa-tag--warn">
              {p.label}: <b>{p.status}</b>
            </span>
          ))}
        </div>
      )}

      {mechanics.length > 0 ? (
        <>
          <span className="cd-sub">Механика</span>
          <div className="cd-mech">
            {mechanics.map((m) => (
              <div key={m.label} className={m.tone === "warn" ? "is-warn" : undefined}>
                <span>
                  <span className={`sa-dot ${m.tone === "warn" ? "sa-dot--warn" : "sa-dot--pos"}`} aria-hidden="true" />
                  {m.label}
                </span>
                <b>{m.status}</b>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </FoldOnPhone>
  );
}
