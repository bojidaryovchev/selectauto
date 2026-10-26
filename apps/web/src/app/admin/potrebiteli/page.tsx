import { auth } from "@/auth";
import { UsersManager } from "@/components/admin/users";
import { APP_ROLE_META, APP_ROLES } from "@/constants/admin";
import { requireAdminPage } from "@/lib/admin";
import { listUsers } from "@/queries/users";

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
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Потребители</h1>
        <ul className="flex max-w-3xl flex-col gap-1 text-sm text-muted">
          {APP_ROLES.map((r) => (
            <li key={r}>
              <strong>{APP_ROLE_META[r].label}</strong> — {APP_ROLE_META[r].description}
            </li>
          ))}
        </ul>
        <p className="mt-2 max-w-3xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Нов служител първо се регистрира на сайта, след което тук му се дава роля — тя влиза в сила при
          следващото му влизане в профила. Отнемане или смяна на роля на служител влиза в сила до минута.
        </p>
      </div>
      <UsersManager users={users} currentUserId={me?.user?.id ?? session.user?.id} />
    </div>
  );
}
