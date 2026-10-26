"use client";

import { AdminBanner, AdminButton } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { activateTariffUpload } from "@/mutations/tariffs";
import type { TariffUploadRow } from "@/queries/tariffs";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The tariff versions, newest first, then the built-in table they all started
 * from. Exactly one is active — the built-in table when no upload is — and any
 * other can be made active again (activateTariffUpload): the undo for a paste
 * that turned out wrong, which before meant pasting the old table again.
 */
export function TariffHistory({
  uploads,
  builtin,
}: {
  uploads: TariffUploadRow[];
  builtin: { inlandRows: number; containerRows: number };
}) {
  const router = useRouter();
  const [target, setTarget] = useState<{ id: number | null; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const result = await activateTariffUpload(target.id);
      if (result.success) router.refresh();
      else setError(result.error);
    } catch {
      setError("Връзката прекъсна — активната таблица не е сменена. Опитайте отново.");
    } finally {
      setTarget(null);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
      <ul className="m-0 list-none overflow-hidden rounded-xl border border-line bg-white p-0">
        {uploads.map((u) => (
          <Version
            key={u.id}
            title={u.filename}
            meta={[
              formatSofiaDateTime(u.createdAt),
              u.uploadedByName,
              `${u.inlandRows} реда, ${u.containerRows} контейнерни цени`,
            ]}
            active={u.active}
            disabled={busy}
            onActivate={() => setTarget({ id: u.id, label: `версията от ${formatSofiaDateTime(u.createdAt)}` })}
          />
        ))}
        <Version
          title="Вградена таблица"
          meta={["в кода на сайта", `${builtin.inlandRows} реда, ${builtin.containerRows} контейнерни цени`]}
          active={!uploads.some((u) => u.active)}
          disabled={busy}
          onActivate={() => setTarget({ id: null, label: "вградената таблица" })}
        />
      </ul>

      <ConfirmDialog
        isOpen={target !== null}
        title={`Да активирам ли ${target?.label ?? ""}?`}
        message="Калкулаторът, офертите по имейл и mobile.bg ще смятат транспорта по нея от следващото зареждане."
        confirmLabel="Активирай"
        isPending={busy}
        onConfirm={() => void activate()}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}

function Version({
  title,
  meta,
  active,
  disabled,
  onActivate,
}: {
  title: string;
  meta: (string | null)[];
  active: boolean;
  disabled: boolean;
  onActivate: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 border-b border-line/60 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-semibold wrap-anywhere text-ink">{title}</p>
        <p className="text-xs text-muted">{meta.filter(Boolean).join(" · ")}</p>
      </div>
      {active ? (
        <span className="self-start rounded-full bg-[#e8f5ec] px-2.5 py-1 text-xs font-bold text-[#1d6b35] sm:self-auto">
          Активна
        </span>
      ) : (
        <AdminButton variant="secondary" className="self-start sm:self-auto" disabled={disabled} onClick={onActivate}>
          Активирай
        </AdminButton>
      )}
    </li>
  );
}
