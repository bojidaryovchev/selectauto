import {
  MobilebgAdvertList,
  MobilebgMappingDesk,
  MobilebgPublisher,
} from "@/components/admin/mobilebg";
import { requireBackOfficePage } from "@/lib/admin";
import { isConfigured } from "@/lib/mobilebg/client";
import { listMobilebgAdverts, listMobilebgMappings } from "@/queries/mobilebg";

/**
 * /admin/mobile-bg — публикуване на автомобили в mobile.bg.
 *
 * Open to the whole back office, „Наблюдаващ“ included, at the owner's request
 * (18.09.2026). Publishing still spends money (mobile.bg bills for every week an
 * advert stays active) and puts our name on a public advert, so the guardrails are
 * the preview, the blockers and the confirm dialog rather than the role. The
 * markup % behind the price stays in /admin/тарифи, which remains admin-only.
 */
export default async function AdminMobilebgPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireBackOfficePage();
  const sp = await searchParams;

  const [{ rows, total }, mappings] = await Promise.all([
    listMobilebgAdverts(Number(sp.page) || 1),
    listMobilebgMappings(),
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
        <h2 className="mb-1 text-lg font-black tracking-tight text-ink">Запомнени съответствия</h2>
        <p className="mb-3 text-sm text-muted">
          Марките и моделите се разпознават автоматично по речника на mobile.bg — по същото име,
          известен синоним или обозначението в заглавието („330I“ → „330“). Тук са само ръчно
          потвърдените изключения, зададени от прегледа на обявата. Премахването връща модела към
          автоматичното разпознаване.
        </p>
        <MobilebgMappingDesk brands={mappings.brands} models={mappings.models} />
      </div>
    </div>
  );
}
