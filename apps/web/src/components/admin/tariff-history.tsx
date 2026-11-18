"use client";

import { AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { activateTariffUpload } from "@/mutations/tariffs";
import type { TariffUploadRow } from "@/queries/tariffs";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The tariff versions, newest first, then the built-in table they all started
 * from (board `ab-tariffs`, `-states`, `-states3`; parity check docs/design/parity/admin-tariffs.md). Exactly one is
 * active — the built-in table when no upload is — and any other can be made active again (activateTariffUpload): the
 * undo for a paste that turned out wrong, which before meant pasting the old table again.
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
    <div className="ab-stack">
      {error ? (
        <AdminBanner tone="error" className="ab-al">
          {error}
        </AdminBanner>
      ) : null}
      <ul className="ab-vers">
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
        confirmLabel="Активирайте"
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
    <li>
      <div>
        <b>{title}</b>
        <small>{meta.filter(Boolean).join(" · ")}</small>
      </div>
      {active ? (
        <span className="sa-tag sa-tag--pos ab-st">Активна</span>
      ) : (
        <Button variant="sec" size="md" disabled={disabled} onClick={onActivate}>
          Активирайте
        </Button>
      )}
    </li>
  );
}
