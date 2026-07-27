import { CalcConfigForm, TariffUploadForm } from "@/components/admin";
import { requireAdminPage } from "@/lib/admin";
import { getCalcConfig, listTariffUploads } from "@/queries/tariffs";

/**
 * /admin/tarifi — the import-calculator manager. Two independent controls:
 *  1. The business constants (fees, commission tiers, transport legs, agency,
 *     technotest, duty/VAT/FX) — an editable form (updateCalcConfig).
 *  2. The CargoLoop US/Canada shipping table (596 rows) — pasted as TSV
 *     (uploadTariffs); versioned, newest active, seed fallback.
 * Both take effect immediately (server recompute + client). The layout gates the
 * route to admins.
 */
export default async function AdminTariffsPage() {
  await requireAdminPage();
  const [config, uploads] = await Promise.all([getCalcConfig(), listTariffUploads()]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Настройки на калкулатора</h1>
          <p className="max-w-2xl text-sm text-muted">
            Такси, комисионни, транспорт, мито/ДДС и валутен курс. Промените се прилагат веднага в калкулатора за внос.
          </p>
        </div>
        <CalcConfigForm initial={config} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-black tracking-tight text-ink">Транспортна таблица (САЩ/Канада)</h2>
          <p className="max-w-2xl text-sm text-muted">
            Таблицата с цените по локация от CargoLoop. Поставете я от Excel/Sheets. Новата версия се активира веднага;
            при липса — калкулаторът ползва вградените базови тарифи.
          </p>
        </div>

        <TariffUploadForm />

      <div>
        <h2 className="mb-3 text-lg font-black text-ink">История на качванията</h2>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted">Още няма качени тарифи — калкулаторът ползва вградените базови стойности.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Дата</th>
                  <th className="px-4 py-3 font-semibold">Описание</th>
                  <th className="px-4 py-3 font-semibold">Редове</th>
                  <th className="px-4 py-3 font-semibold">Бележка</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {u.createdAt.toLocaleString("bg-BG")}
                    </td>
                    <td className="px-4 py-3 text-ink">{u.filename}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {u.inlandRows} + {u.containerRows}
                    </td>
                    <td className="px-4 py-3 text-muted">{u.note ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="rounded-full bg-[#e8f5ec] px-2.5 py-1 text-xs font-bold text-[#1d6b35]">
                          Активна
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted">
                          Архив
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
