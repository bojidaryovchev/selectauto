import { auth } from "@/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/users";
import { ChevronDownIcon } from "@/components/icons";
import { APP_ROLE_META, APP_ROLES } from "@/constants/admin";
import { requireAdminPage } from "@/lib/admin";
import { listUsers } from "@/queries/users";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Потребители" };

/**
 * /admin/potrebiteli — account roles. „Наблюдаващ" (e.g. Радка и другите, които
 * създават договори) is granted here: the person registers on the site normally,
 * then an admin ticks the role. Admin-only; unlimited such profiles. The role
 * legend comes from APP_ROLE_META, next to what each role may actually do.
 */
export default async function AdminUsersPage() {
  const session = await requireAdminPage();
  const users = await listUsers();
  const me = await auth();

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Потребители"
        description="Нов служител първо се регистрира на сайта, след което тук му се дава роля — тя влиза в сила при следващото му влизане в профила. Отнемане или смяна на роля на служител влиза в сила до минута."
      />

      <details className="group rounded-xl border border-line bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-black text-ink select-none sm:px-5 [&::-webkit-details-marker]:hidden">
          Какво може всяка роля
          <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="m-0 flex list-none flex-col gap-2 border-t border-line px-4 py-3 text-sm text-muted sm:px-5">
          {APP_ROLES.map((r) => (
            <li key={r}>
              <strong className="text-ink">{APP_ROLE_META[r].label}</strong> — {APP_ROLE_META[r].description}
            </li>
          ))}
        </ul>
      </details>

      <UsersManager users={users} currentUserId={me?.user?.id ?? session.user?.id} />
    </div>
  );
}
