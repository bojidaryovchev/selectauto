"use client";

import { ADMIN_INPUT, AdminBanner, adminChipClass, AdminEmptyState } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { APP_ROLE_META, APP_ROLES, type AppRole } from "@/constants/admin";
import { formatSofiaDate } from "@/lib/sofia-time";
import { setUserRoles } from "@/mutations/users";
import type { UserRow } from "@/queries/users";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * /admin/potrebiteli — grant or revoke the elevated roles on an account. This is
 * how „профил на Радка" gets made: the person registers on the site as usual,
 * then an admin ticks „Наблюдаващ" here. Any number of such profiles is allowed.
 *
 * An admin can't change their own roles (the mutation refuses), which rules out
 * locking yourself out of the back office. Администратор is full access, so
 * granting or removing it asks first; the other roles switch at a tap. The list
 * is every account on the site, so it can be searched and narrowed to staff.
 */
type Pending = { user: UserRow; grant: boolean };

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId?: string }) {
  const router = useRouter();
  const searchId = useId();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Next to the account it concerns, not at the top of a long list.
  const [error, setError] = useState<{ userId: string; message: string } | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<Pending | null>(null);
  const [query, setQuery] = useState("");
  const [staffOnly, setStaffOnly] = useState(false);

  async function setRole(user: UserRow, role: AppRole, grant: boolean) {
    setBusyId(user.id);
    setError(null);
    try {
      const roles = grant ? [...new Set([...user.roles, role])] : user.roles.filter((r) => r !== role);
      const result = await setUserRoles({ userId: user.id, roles });
      if (result.success) router.refresh();
      else setError({ userId: user.id, message: result.error });
    } catch {
      setError({ userId: user.id, message: "Връзката прекъсна — ролята не е сменена. Опитайте отново." });
    } finally {
      setBusyId(null);
    }
  }

  function toggle(user: UserRow, role: AppRole, grant: boolean) {
    if (role === "admin") setConfirmAdmin({ user, grant });
    else void setRole(user, role, grant);
  }

  const q = query.trim().toLowerCase();
  const shown = users.filter(
    (u) =>
      (!staffOnly || u.roles.length > 0) &&
      (!q || u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q)),
  );

  const rowProps = (u: UserRow) => ({
    user: u,
    isSelf: u.id === currentUserId,
    busy: busyId === u.id,
    error: error?.userId === u.id ? error.message : null,
    onToggle: (role: AppRole, grant: boolean) => toggle(u, role, grant),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={searchId} className="sr-only">
          Търсене по име или имейл
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Търсене по име или имейл…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`${ADMIN_INPUT} sm:max-w-sm`}
        />
        <button
          type="button"
          aria-pressed={staffOnly}
          onClick={() => setStaffOnly((v) => !v)}
          className={`${adminChipClass(staffOnly)} self-start sm:self-auto`}
        >
          Само с роли
        </button>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        Показани: <span className="font-bold text-ink">{shown.length}</span> от {users.length}
      </p>

      {shown.length === 0 ? (
        <AdminEmptyState
          title={users.length === 0 ? "Няма регистрирани потребители." : "Никой не отговаря на търсенето."}
        />
      ) : (
        <div className="@container">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 @4xl:hidden">
            {shown.map((u) => (
              <li key={u.id} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
                <Identity {...rowProps(u)} />
                <Roles {...rowProps(u)} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-line bg-white @4xl:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Потребител</th>
                  <th className="w-px px-4 py-3 font-semibold whitespace-nowrap">Регистриран</th>
                  <th className="px-4 py-3 font-semibold">Роли</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="px-4 py-3">
                      <Identity {...rowProps(u)} hideDate />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatSofiaDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Roles {...rowProps(u)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmAdmin !== null}
        tone={confirmAdmin?.grant ? "brand" : "danger"}
        title={confirmAdmin?.grant ? "Да дам ли права на администратор?" : "Да отнема ли правата на администратор?"}
        message={
          confirmAdmin
            ? confirmAdmin.grant
              ? `${confirmAdmin.user.name ?? confirmAdmin.user.email} ще има пълен достъп: всички договори, плащания, заявки, поща, тарифи и потребители.`
              : `${confirmAdmin.user.name ?? confirmAdmin.user.email} губи пълния достъп до минута.`
            : undefined
        }
        confirmLabel={confirmAdmin?.grant ? "Дай права" : "Отнеми правата"}
        isPending={busyId !== null}
        onConfirm={() => {
          const pending = confirmAdmin;
          setConfirmAdmin(null);
          if (pending) void setRole(pending.user, "admin", pending.grant);
        }}
        onCancel={() => setConfirmAdmin(null)}
      />
    </div>
  );
}

type RowProps = {
  user: UserRow;
  isSelf: boolean;
  busy: boolean;
  error: string | null;
  onToggle: (role: AppRole, grant: boolean) => void;
};

function Identity({ user: u, isSelf, hideDate }: RowProps & { hideDate?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold wrap-anywhere text-ink">
        {u.name ?? "—"}
        {isSelf ? <span className="ml-2 text-xs font-normal text-muted">(вие)</span> : null}
      </p>
      <p className="text-sm wrap-anywhere text-muted">
        {u.email}
        {u.emailVerified ? null : (
          <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            непотвърден
          </span>
        )}
      </p>
      {hideDate ? null : <p className="text-xs text-muted">Регистриран {formatSofiaDate(u.createdAt)}</p>}
    </div>
  );
}

/** The roles as labelled toggle pills — 40 px, readable, and reachable by keyboard (real checkboxes). */
function Roles({ user: u, isSelf, busy, error, onToggle }: RowProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Роли на ${u.name ?? u.email}`}>
        {APP_ROLES.map((r) => {
          const on = u.roles.includes(r);
          return (
            <label key={r} className={adminChipClass(on, isSelf || busy)}>
              <input
                type="checkbox"
                checked={on}
                disabled={isSelf || busy}
                onChange={(e) => onToggle(r, e.target.checked)}
                className="sr-only"
              />
              {APP_ROLE_META[r].label}
            </label>
          );
        })}
      </div>
      {isSelf ? <p className="text-xs text-muted">Собствените си права не можете да променяте.</p> : null}
      {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
    </div>
  );
}
