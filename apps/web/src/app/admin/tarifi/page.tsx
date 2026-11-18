import { CalcConfigForm, TariffHistory, TariffUploadForm } from "@/components/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import { US_CONTAINER_PRICES, US_INLAND_TARIFFS } from "@/data/us-transport-tariffs";
import { requireAdminPage } from "@/lib/admin";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { getCalcConfig, getCalcConfigMeta, listTariffUploads } from "@/queries/tariffs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Тарифи" };

/** The built-in table's size, shown with the versions (the owner-quoted yards come on top of every table). */
const BUILTIN = {
  inlandRows: US_INLAND_TARIFFS.length,
  containerRows: Object.values(US_CONTAINER_PRICES).reduce((n, m) => n + Object.keys(m).length, 0),
};

/**
 * /admin/tarifi — the import-calculator manager (boards `ab-tariffs` and its states; parity check
 * docs/design/parity/admin-tariffs.md). Two independent controls:
 *  1. The business constants (fees, commission tiers, transport legs, agency,
 *     technotest, duty/VAT/FX, mobile.bg markup) — an editable form (updateCalcConfig).
 *  2. The CargoLoop US/Canada shipping table (596 rows) — pasted as TSV, checked
 *     against the active table first (checkTariffsAction), then stored as the new
 *     active version (uploadTariffs); any version, or the built-in table, can be
 *     made active again (activateTariffUpload).
 * Both apply from the next request (updateTag) in the calculator, the emailed
 * offers and mobile.bg. `requireAdminPage()` is the gate: the /admin layout only
 * requires back-office access.
 */
export default async function AdminTariffsPage() {
  await requireAdminPage();
  const [config, meta, uploads] = await Promise.all([getCalcConfig(), getCalcConfigMeta(), listTariffUploads()]);
  const active = uploads.find((u) => u.active);

  return (
    <>
      <AdminPageHeader
        title="Тарифи"
        description="Цените, по които калкулаторът за внос, офертите по имейл и обявите в mobile.bg смятат крайната сума."
      />

      <section aria-labelledby="calc-settings-title" className="ab-tsec">
        <header>
          <h2 id="calc-settings-title">Настройки на калкулатора</h2>
          <p>
            Такси, комисионни, транспорт, мито/ДДС и валутен курс.{" "}
            {meta
              ? `Последна промяна: ${formatSofiaDateTime(meta.updatedAt)}${meta.updatedByName ? ` · ${meta.updatedByName}` : ""}.`
              : "Още не са променяни — в сила са вградените стойности."}
          </p>
        </header>
        <CalcConfigForm initial={config} />
      </section>

      <section aria-labelledby="us-table-title" className="ab-tsec">
        <header>
          <h2 id="us-table-title">Транспортна таблица (САЩ/Канада)</h2>
          <p>
            Цените по локация от CargoLoop.{" "}
            {active
              ? `Активна е версията от ${formatSofiaDateTime(active.createdAt)}.`
              : "Активна е вградената таблица."}{" "}
            Нова версия се проверява срещу активната, преди да влезе в сила.
          </p>
        </header>
        <TariffUploadForm />
        <h3 className="ab-h2">Версии</h3>
        <TariffHistory uploads={uploads} builtin={BUILTIN} />
      </section>
    </>
  );
}
