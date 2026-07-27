import { auth } from "@/auth";
import { UsersManager } from "@/components/admin/users";
import { requireAdminPage } from "@/lib/admin";
import { listUsers } from "@/queries/users";

/**
 * /admin/potrebiteli — account roles. „Наблюдаващ" (e.g. Радка и другите, които
 * създават договори) is granted here: the person registers on the site normally,
 * then an admin ticks the role. Admin-only; unlimited such profiles.
 */
export default async function AdminUsersPage() {
  const session = await requireAdminPage();
  const users = await listUsers();
  const me = await auth();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Потребители</h1>
        <p className="max-w-3xl text-sm text-muted">
          <strong>Администратор</strong> — пълен достъп. <strong>Наблюдаващ</strong> — създава договори и депозити,
          вижда <em>само своите</em> договори и следи плащанията по тях; не може да редактира договори, да генерира
          известия, да отбелязва плащания, нито да вижда заявките от сайта.
        </p>
        <p className="mt-2 max-w-3xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Нов служител първо се регистрира на сайта (с имейл и парола), след което тук му се дава роля. Промяната
          влиза в сила при следващото му влизане в профила.
        </p>
      </div>
      <UsersManager users={users} currentUserId={me?.user?.id ?? session.user?.id} />
    </div>
  );
}
