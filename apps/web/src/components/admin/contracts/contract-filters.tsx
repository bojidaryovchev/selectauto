import { CONTRACT_STATUS_META, CONTRACT_STATUSES } from "@/constants/contracts";

/**
 * Search + status filter for /admin/dogovori. A plain GET form — the page
 * re-renders server-side from the URL params, no client JS needed (same idea
 * as the lead-inbox filters).
 */
export function ContractFilters({ q, status }: { q?: string; status?: string }) {
  return (
    <form method="get" action="/admin/dogovori" className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        name="q"
        defaultValue={q ?? ""}
        placeholder="Търсене: №, VIN, марка, клиент…"
        className="w-64 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-brand"
      />
      <select
        name="status"
        defaultValue={status ?? ""}
        className="rounded-full border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
      >
        <option value="">Всички статуси</option>
        {CONTRACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CONTRACT_STATUS_META[s].label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Филтрирай
      </button>
    </form>
  );
}
