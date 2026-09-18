import {
  MobilebgAdvertList,
  MobilebgMappingDesk,
  MobilebgPublisher,
} from "@/components/admin/mobilebg";
import { requireAdminPage } from "@/lib/admin";
import { dealerStorefrontUrl, isConfigured } from "@/lib/mobilebg/client";
import { listMobilebgAdverts, listMobilebgMappings } from "@/queries/mobilebg";

/**
 * /admin/mobile-bg — публикуване на автомобили в mobile.bg.
 *
 * Admin-only, explicitly: the /admin layout gates only to back-office level, and
 * every action here spends money on an external platform and puts our name on a
 * public advert. An „Наблюдаващ" must not reach it.
 */
export default async function AdminMobilebgPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;

  const storefront = dealerStorefrontUrl();
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
        {storefront && (
          <p className="mt-1 text-sm">
            <a
              href={storefront}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-brand hover:underline"
            >
              Витрината ни в mobile.bg
            </a>
          </p>
        )}
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
