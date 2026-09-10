import {
  MobilebgAdvertList,
  MobilebgMappingDesk,
  MobilebgPublisher,
} from "@/components/admin/mobilebg";
import { requireAdminPage } from "@/lib/admin";
import { isConfigured } from "@/lib/mobilebg/client";
import { getMobilebgBrandOptions, listMobilebgAdverts, listMobilebgMappings } from "@/queries/mobilebg";

/**
 * /admin/mobile-bg — публикуване на автомобили в mobile.bg.
 *
 * Admin-only, explicitly: the /admin layout gates only to back-office level, and
 * every action here spends money on an external platform and puts our name on a
 * public advert. An „Наблюдаващ" must not reach it.
 *
 * The brand-list fetch hits mobile.bg's PUBLIC dictionary, so the mapping desk
 * works before the import account is authorised — which is the state we are in
 * until they enable it. It fails soft: an empty option list degrades the picker,
 * it does not break the page.
 */
export default async function AdminMobilebgPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;

  const [{ rows, total }, mappings, brandOptions] = await Promise.all([
    listMobilebgAdverts(Number(sp.page) || 1),
    listMobilebgMappings(),
    getMobilebgBrandOptions().catch((error) => {
      console.error("[mobilebg] brand options failed", error);
      return [];
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">mobile.bg</h1>
        <p className="text-sm text-muted">
          Публикуване на автомобил от каталога като обява в mobile.bg. Цената в обявата е крайната
          цена за България (себестойност от калкулатора + надценката от „Тарифи“), а не аукционната
          цена на лота.
        </p>
      </div>

      {!isConfigured() && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Акаунтът за импорт още не е конфигуриран. Задайте <code>MOBILEBG_USERNAME</code> и{" "}
          <code>MOBILEBG_PASSWORD</code>, след като mobile.bg оторизира акаунта и регистрира
          домейна за снимките. Дотогава всичко тук се изчислява и проверява, но нищо не се изпраща.
        </p>
      )}

      <MobilebgPublisher />

      <div>
        <h2 className="mb-2 text-lg font-black tracking-tight text-ink">
          Обяви <span className="text-sm font-semibold text-muted">({total})</span>
        </h2>
        <MobilebgAdvertList rows={rows} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-black tracking-tight text-ink">Съответствия марки и модели</h2>
        <p className="mb-3 text-sm text-muted">
          mobile.bg приема само свои имена на марки и модели („VW“, а не Volkswagen; „KGM“, а не
          SsangYong). Грешен модел не дава грешка — обявата просто попада там, където никой не я
          търси, затова връзката се потвърждава веднъж и се пази.
        </p>
        <MobilebgMappingDesk
          brandOptions={brandOptions}
          brands={mappings.brands}
          models={mappings.models}
        />
      </div>
    </div>
  );
}
