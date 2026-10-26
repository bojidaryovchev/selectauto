import { ADMIN_INPUT, ADMIN_SELECT, AdminButton, AdminButtonLink } from "@/components/admin/ui";
import { CONTRACT_STATUS_META, CONTRACT_STATUSES } from "@/constants/contracts";

/**
 * Search + status filter for /admin/dogovori. A plain GET form — the page
 * re-renders server-side from the URL params, no client JS needed (same idea
 * as the lead-inbox filters). Stacked on a phone, one row from `sm` up.
 */
export function ContractFilters({ q, status }: { q?: string; status?: string }) {
  return (
    <form
      method="get"
      action="/admin/dogovori"
      role="search"
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <label htmlFor="contracts-q" className="sr-only">
        Търсене
      </label>
      <input
        id="contracts-q"
        type="search"
        name="q"
        enterKeyHint="search"
        defaultValue={q ?? ""}
        placeholder="Търсене: №, VIN, марка, клиент…"
        className={`${ADMIN_INPUT} sm:w-72`}
      />
      <label htmlFor="contracts-status" className="sr-only">
        Статус
      </label>
      <select id="contracts-status" name="status" defaultValue={status ?? ""} className={`${ADMIN_SELECT} sm:w-auto`}>
        <option value="">Всички статуси</option>
        {CONTRACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CONTRACT_STATUS_META[s].label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <AdminButton type="submit" variant="primary" className="flex-1 sm:flex-none">
          Филтрирай
        </AdminButton>
        {q || status ? (
          <AdminButtonLink href="/admin/dogovori" variant="ghost">
            Изчисти
          </AdminButtonLink>
        ) : null}
      </div>
    </form>
  );
}
