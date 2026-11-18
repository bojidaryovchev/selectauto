import { ADMIN_INPUT } from "@/components/admin/ui";
import { Button, LinkButton } from "@/components/common";
import { ChevronDownIcon, FilterIcon, SearchIcon } from "@/components/icons";
import { CONTRACT_STATUS_META, CONTRACT_STATUSES } from "@/constants/contracts";

/**
 * Search + status filter for /admin/dogovori (`ab-filt`; board `ab-contracts-filter`). A plain GET form — the page
 * re-renders server-side from the URL params, no client JS needed (same idea as the lead-inbox filters). Stacked on a
 * phone, one row from there.
 */
export function ContractFilters({ q, status }: { q?: string; status?: string }) {
  return (
    <form method="get" action="/admin/dogovori" role="search" className="ab-filt">
      <label htmlFor="contracts-q" className="sr-only">
        Търсене
      </label>
      <span className="sa-inw">
        <SearchIcon />
        <input
          id="contracts-q"
          type="search"
          name="q"
          enterKeyHint="search"
          defaultValue={q ?? ""}
          placeholder="Търсене: №, VIN, марка, клиент…"
          className={ADMIN_INPUT}
        />
      </span>
      <label htmlFor="contracts-status" className="sr-only">
        Статус
      </label>
      <span className="sa-selw">
        <select id="contracts-status" name="status" defaultValue={status ?? ""} className={ADMIN_INPUT}>
          <option value="">Всички статуси</option>
          {CONTRACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTRACT_STATUS_META[s].label}
            </option>
          ))}
        </select>
        <ChevronDownIcon />
      </span>
      <div className="ab-filt__b">
        <Button type="submit" variant="sec" size="md">
          <FilterIcon />
          Филтрирайте
        </Button>
        {q || status ? (
          <LinkButton href="/admin/dogovori" variant="txt" size="md">
            Изчистете
          </LinkButton>
        ) : null}
      </div>
    </form>
  );
}
