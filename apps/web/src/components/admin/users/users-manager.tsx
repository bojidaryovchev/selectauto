"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_ROLE_META, APP_ROLES, type AppRole } from "@/constants/admin";
import { setUserRoles } from "@/mutations/users";
import type { UserRow } from "@/queries/users";

/**
 * /admin/potrebiteli — grant or revoke the elevated roles on an account. This is
 * how „профил на Радка" gets made: the person registers on the site as usual,
 * then an admin ticks „Наблюдаващ" here. Any number of such profiles is allowed.
 *
 * An admin can't change their own roles (the mutation refuses), which rules out
 * locking yourself out of the back office.
 */
export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId?: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleRole(user: UserRow, role: AppRole, next: boolean) {
    setBusyId(user.id);
    setError(null);
    try {
      const roles = next ? [...new Set([...user.roles, role])] : user.roles.filter((r) => r !== role);
      const result = await setUserRoles({ userId: user.id, roles });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Възникна грешка при запис. Моля опитайте отново.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Име</th>
              <th className="px-4 py-3 font-semibold">Имейл</th>
              <th className="px-4 py-3 font-semibold">Регистриран</th>
              {APP_ROLES.map((r) => (
                <th key={r} className="px-4 py-3 text-center font-semibold">
                  {APP_ROLE_META[r].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {u.name ?? "—"}
                    {isSelf ? <span className="ml-2 text-xs font-normal text-muted">(вие)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.email}
                    {u.emailVerified ? null : (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        непотвърден
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{u.createdAt.toLocaleDateString("bg-BG")}</td>
                  {APP_ROLES.map((r) => (
                    <td key={r} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.roles.includes(r)}
                        disabled={isSelf || busyId === u.id}
                        onChange={(e) => void toggleRole(u, r, e.target.checked)}
                        className="size-4 accent-brand disabled:opacity-40"
                        title={isSelf ? "Не можете да променяте собствените си права." : undefined}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={3 + APP_ROLES.length} className="px-4 py-6 text-center text-sm text-muted">
                  Няма регистрирани потребители.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
