import { MobilebgAdvertList, MobilebgMappingDesk, MobilebgPublisher } from "@/components/admin/mobilebg";
import { AdminBanner, AdminPageHeader, AdminPagination, adminChipClass } from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import { requirePageWith } from "@/lib/admin";
import { isConfigured } from "@/lib/mobilebg/client";
import { listMobilebgAdverts, listMobilebgMappings } from "@/queries/mobilebg";
import type { Metadata } from "next";
import Link from "next/link";

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
export default async function AdminMobilebgPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  await requirePageWith("mobilebg.publish");
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const filter = sp.filter === "ended" ? "ended" : "all";
  const [{ rows, total, endedLive }, mappings] = await Promise.all([
    listMobilebgAdverts(page, filter),
    listMobilebgMappings(),
  ]);
  // The register was cut at 50 rows with no way to the rest; `?page=` worked
  // but nothing linked to it.
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const hrefFor = (p: number, f: "all" | "ended" = filter) => {
    const q = new URLSearchParams();
    if (f === "ended") q.set("filter", "ended");
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `/admin/mobile-bg?${qs}` : "/admin/mobile-bg";
  };

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
        <div className="flex flex-col gap-4">
          {endedLive > 0 || filter === "ended" ? (
            <div className="flex flex-col gap-2">
              {endedLive > 0 ? (
                <AdminBanner tone="warning" className="font-normal">
                  <strong>{endedLive}</strong>{" "}
                  {endedLive === 1
                    ? "обява е за кола, която вече не се предлага в сайта"
                    : "обяви са за коли, които вече не се предлагат в сайта"}{" "}
                  (търгът е приключил или колата е скрита). mobile.bg ги таксува всяка седмица, докато не бъдат изтрити.
                </AdminBanner>
              ) : null}
              <nav aria-label="Филтър на обявите" className="flex flex-wrap gap-2">
                <Link
                  href={hrefFor(1, "all")}
                  aria-current={filter === "all" ? "true" : undefined}
                  className={adminChipClass(filter === "all")}
                >
                  Всички
                </Link>
                <Link
                  href={hrefFor(1, "ended")}
                  aria-current={filter === "ended" ? "true" : undefined}
                  className={adminChipClass(filter === "ended")}
                >
                  Колата вече не е в сайта ({endedLive})
                </Link>
              </nav>
            </div>
          ) : null}
          <MobilebgAdvertList rows={rows} />
          <AdminPagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
        </div>
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
