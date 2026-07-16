"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LEAD_STATUS_META, LEAD_STATUSES } from "@/constants/admin";

/**
 * Inbox filter bar: a status tab row + a free-text search box. Both write to the
 * URL search params (`status`, `q`) and reset `page`, so the server component
 * re-queries. "Всички" clears the status filter (server then hides `archived`);
 * an explicit "Архив" tab surfaces filed leads.
 */
export function LeadFilters({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
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

  const tabs = [{ key: "", label: "Всички" }, ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_META[s].label }))];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => {
          const active = currentStatus === t.key;
          return (
            <button
              key={t.key || "all"}
              type="button"
              onClick={() => apply({ status: t.key })}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <form
        className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Търси по име, телефон, VIN…"
          className="h-10 w-full rounded-full border border-line bg-white px-4 text-sm text-ink outline-none focus:border-brand sm:w-64"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Търси
        </button>
      </form>
    </div>
  );
}
