"use client";

import { ADMIN_INPUT, adminChipClass } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { SearchIcon } from "@/components/icons";
import { LEAD_STATUS_META, LEAD_STATUSES } from "@/constants/admin";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

/**
 * Inbox filter bar (boards `ad-carfax`, `ad-inquiries-list`): a search field with its button, and a row of status
 * chips. Both write to the URL search params (`status`, `q`) and reset `page`, so the server component re-queries.
 * "Всички" clears the status filter (server then hides `archived`); an explicit "Архив" chip surfaces filed leads.
 */
export function LeadFilters({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const searchId = useId();
  const currentStatus = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(next: { status?: string; q?: string }) {
    const sp = new URLSearchParams(params.toString());
    if (next.status !== undefined) {
      if (next.status) sp.set("status", next.status);
      else sp.delete("status");
    }
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const tabs = [
    { key: "", label: "Всички" },
    ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_META[s].label })),
  ];

  return (
    <div className="ad-tools">
      <form
        role="search"
        className="ad-search"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <label htmlFor={searchId} className="sr-only">
          Търсене
        </label>
        <span className="sa-inw ad-grow">
          <SearchIcon />
          <input
            id={searchId}
            type="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Търсете по име, телефон, VIN…"
            className={ADMIN_INPUT}
          />
        </span>
        <Button type="submit" variant="sec" size="md" className="ad-search__b shrink-0">
          Търсете
        </Button>
      </form>

      <div className="sa-chips" role="group" aria-label="Филтър по статус">
        {tabs.map((t) => {
          const active = currentStatus === t.key;
          return (
            <button
              key={t.key || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ status: t.key })}
              className={adminChipClass(active)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
