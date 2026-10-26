import { MobilebgAdvertList, MobilebgMappingDesk, MobilebgPublisher } from "@/components/admin/mobilebg";
import { AdminBanner, AdminPageHeader } from "@/components/admin/ui";
import { requirePageWith } from "@/lib/admin";
import { isConfigured } from "@/lib/mobilebg/client";
import { listMobilebgAdverts, listMobilebgMappings } from "@/queries/mobilebg";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "mobile.bg" };

/**
 * /admin/mobile-bg — публикуване на автомобили в mobile.bg.
 *
 * Gated on `mobilebg.publish`, which „Наблюдаващ“ carries too, at the owner's
 * request (18.09.2026). Publishing still spends money (mobile.bg bills for every week an
 * advert stays active) and puts our name on a public advert, so the guardrails are
 * the preview, the blockers and the confirm dialog rather than the role. The
 * markup % behind the price stays in /admin/тарифи, which remains admin-only.
 */
export default async function AdminMobilebgPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePageWith("mobilebg.publish");
  const sp = await searchParams;

  const [{ rows, total }, mappings] = await Promise.all([
    listMobilebgAdverts(Number(sp.page) || 1),
    listMobilebgMappings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <AdminPageHeader
          title="mobile.bg"
          description="Публикуване на автомобил от каталога като обява в mobile.bg. Цената в обявата е крайната цена за България (себестойност от калкулатора + надценката от „Тарифи“), а не аукционната цена на лота."
        />

        {!isConfigured() && (
          <AdminBanner tone="warning" className="font-normal">
            Акаунтът за импорт още не е конфигуриран. Задайте <code>MOBILEBG_USERNAME</code> и{" "}
            <code>MOBILEBG_PASSWORD</code>, след като mobile.bg оторизира акаунта и регистрира домейна за снимките.
            Дотогава всичко тук се изчислява и проверява, но нищо не се изпраща.
          </AdminBanner>
        )}

        <MobilebgPublisher />
      </div>

      <section>
        <h2 className="mb-2 text-lg font-black tracking-tight text-ink">
          Обяви <span className="text-sm font-semibold text-muted">({total})</span>
        </h2>
        <MobilebgAdvertList rows={rows} />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-black tracking-tight text-ink">Запомнени съответствия</h2>
        <p className="mb-3 max-w-3xl text-sm text-muted">
          Марките и моделите се разпознават автоматично по речника на mobile.bg — по същото име, известен синоним или
          обозначението в заглавието („330I“ → „330“). Тук са само ръчно потвърдените изключения, зададени от прегледа
          на обявата. Премахването връща модела към автоматичното разпознаване.
        </p>
        <MobilebgMappingDesk brands={mappings.brands} models={mappings.models} />
      </section>
    </div>
  );
}
