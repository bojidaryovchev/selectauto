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
 * legend comes from APP_ROLE_META, next to what each role may actually do. Boards `ad-users` and its states; parity
 * check docs/design/parity/admin-users.md.
 */
export default async function AdminUsersPage() {
  const session = await requireAdminPage();
  const users = await listUsers();
  const me = await auth();

  return (
    <>
      <AdminPageHeader
        title="Потребители"
        description="Нов служител първо се регистрира на сайта, след което тук му се дава роля — тя влиза в сила при следващото му влизане в профила. Отнемане или смяна на роля на служител влиза в сила до минута."
      />

      <details className="bo-det">
        <summary>
          Какво може всяка роля
          <ChevronDownIcon />
        </summary>
        <ul>
          {APP_ROLES.map((r) => (
            <li key={r}>
              <strong>{APP_ROLE_META[r].label}</strong> — {APP_ROLE_META[r].description}
            </li>
          ))}
        </ul>
      </details>

      <UsersManager users={users} currentUserId={me?.user?.id ?? session.user?.id} />
    </>
  );
}
