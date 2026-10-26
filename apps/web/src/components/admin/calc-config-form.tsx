"use client";

import { ADMIN_HINT, ADMIN_INPUT, ADMIN_LABEL, AdminBanner, AdminButton, AdminCard } from "@/components/admin/ui";
import { type CalcConfig } from "@/data/import-rates";
import { updateCalcConfig } from "@/mutations/tariffs";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Admin form for the calculator's business constants (fees, commission tiers,
 * transport legs, agency, technotest, duty/VAT/FX). Edits a single `CalcConfig`
 * object and submits it to `updateCalcConfig`. The 596-row CargoLoop shipping
 * table is NOT here — that's the separate paste-TSV control.
 */
type Status = { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string };

/**
 * The auction percentages are stored as fractions and edited as percents; the
 * ×100 / ÷100 round trip leaves float noise (7 → "7.000000000000001"), so both
 * directions are cut back to 6 decimals.
 */
const roundPct = (n: number) => Math.round(n * 1e6) / 1e6;

/** "10 000" — the commission brackets' limits. */
const eur = (n: number) => n.toLocaleString("bg-BG");

/**
 * Key order differs between the defaults and a config read back from jsonb, so
 * „unsaved changes" compares the two canonically.
 */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max = 1_000_000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const id = useId();
  // The text being typed. Clearing a field used to save it as 0 (a VAT of 0 %
  // on every quote); now an empty field keeps its value and gets it back on blur.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
        {suffix ? <span className="font-normal text-muted"> ({suffix})</span> : null}
      </label>
      {/* step="any": the browser refuses to submit a value off the input's step,
          and the BC jeep default 3185 against step 10 once made the whole form
          unsavable. min/max mirror the server's limits, so the browser points at
          the field; zod on the server is still the rule. */}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        min={min}
        max={max}
        required
        value={draft ?? String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === "") return;
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => setDraft(null)}
        className={ADMIN_INPUT}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AdminCard>
      <fieldset className="min-w-0">
        <legend className="mb-3 text-base font-black text-ink">{title}</legend>
        <div className="grid gap-3 @lg:grid-cols-2 @4xl:grid-cols-3">{children}</div>
      </fieldset>
    </AdminCard>
  );
}

export function CalcConfigForm({ initial }: { initial: CalcConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<CalcConfig>(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const dirty = canonical(cfg) !== canonical(initial);

  // Immutable nested update by shallow-cloning the touched branch.
  function patch(next: Partial<CalcConfig>) {
    setCfg((c) => ({ ...c, ...next }));
    setStatus({ kind: "idle" });
  }
  function setTier(idx: number, v: number) {
    setCfg((c) => ({
      ...c,
      commissionTiers: c.commissionTiers.map((t, i) => (i === idx ? { ...t, commissionEur: v } : t)),
    }));
    setStatus({ kind: "idle" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await updateCalcConfig(cfg);
      if (result.success) {
        setStatus({ kind: "ok" });
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Връзката прекъсна — настройките не са запазени. Опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="@container flex flex-col gap-4">
      <Section title="Общи (мито, ДДС, курс)">
        <Field label="Мито" suffix="%" max={100} value={cfg.dutyPct} onChange={(v) => patch({ dutyPct: v })} />
        <Field label="ДДС" suffix="%" max={100} value={cfg.vatPct} onChange={(v) => patch({ vatPct: v })} />
        <Field label="Курс EUR→USD" min={0.1} max={10} value={cfg.eurUsd} onChange={(v) => patch({ eurUsd: v })} />
        <Field label="Технотест" suffix="€" value={cfg.technotestEur} onChange={(v) => patch({ technotestEur: v })} />
      </Section>

      <Section title="Корея — Плащане 1 (ENCAR + документи)">
        <Field label="ENCAR такса" suffix="€" value={cfg.krEncarFeeEur} onChange={(v) => patch({ krEncarFeeEur: v })} />
        <Field label="Документи" suffix="%" max={100} value={cfg.krDocsPct} onChange={(v) => patch({ krDocsPct: v })} />
      </Section>

      <Section title="Корея — морски транспорт">
        <Field
          label="Седан"
          suffix="€"
          value={cfg.krTransportEur.sedan}
          onChange={(v) => patch({ krTransportEur: { ...cfg.krTransportEur, sedan: v } })}
        />
        <Field
          label="Джип / SUV"
          suffix="€"
          value={cfg.krTransportEur.suv}
          onChange={(v) => patch({ krTransportEur: { ...cfg.krTransportEur, suv: v } })}
        />
      </Section>

      <Section title="Корея — комисионна (€)">
        {cfg.commissionTiers.map((t, i) => (
          <Field
            key={i}
            label={`При цена до ${eur(t.maxPriceEur)} €`}
            value={t.commissionEur}
            onChange={(v) => setTier(i, v)}
          />
        ))}
        <Field
          label="Над последния праг"
          value={cfg.commissionCapEur}
          onChange={(v) => patch({ commissionCapEur: v })}
        />
      </Section>

      <Section title="САЩ / Канада — аукционна такса">
        <Field
          label="Фикс. такса (≤ праг)"
          suffix="$"
          value={cfg.usAuctionFlatUsd}
          onChange={(v) => patch({ usAuctionFlatUsd: v })}
        />
        <Field
          label="Праг"
          suffix="$"
          value={cfg.usAuctionThresholdUsd}
          onChange={(v) => patch({ usAuctionThresholdUsd: v })}
        />
        <Field
          label="Copart над прага"
          suffix="%"
          max={100}
          value={roundPct(cfg.usAuctionPct.copart * 100)}
          onChange={(v) => patch({ usAuctionPct: { ...cfg.usAuctionPct, copart: roundPct(v / 100) } })}
        />
        <Field
          label="IAAI над прага"
          suffix="%"
          max={100}
          value={roundPct(cfg.usAuctionPct.iaai * 100)}
          onChange={(v) => patch({ usAuctionPct: { ...cfg.usAuctionPct, iaai: roundPct(v / 100) } })}
        />
      </Section>

      <Section title="САЩ / Канада — фиксирани такси">
        <Field
          label="Title"
          suffix="$"
          value={cfg.usFixedFeesUsd.title}
          onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, title: v } })}
        />
        <Field
          label="Environmental"
          suffix="$"
          value={cfg.usFixedFeesUsd.environmental}
          onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, environmental: v } })}
        />
        <Field
          label="Re-invoicing"
          suffix="$"
          value={cfg.usFixedFeesUsd.reinvoicing}
          onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, reinvoicing: v } })}
        />
        <Field
          label="Онлайн наддаване"
          suffix="$"
          value={cfg.usFixedFeesUsd.onlineBid}
          onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, onlineBid: v } })}
        />
      </Section>

      <Section title="След Холандия — агенция и автовоз до БГ (всички пазари)">
        <Field label="Митн. агенция" suffix="€" value={cfg.agencyEur} onChange={(v) => patch({ agencyEur: v })} />
        <Field
          label="Автовоз БГ — седан"
          suffix="€"
          value={cfg.bgTransportEur.sedan}
          onChange={(v) => patch({ bgTransportEur: { ...cfg.bgTransportEur, sedan: v } })}
        />
        <Field
          label="Автовоз БГ — джип"
          suffix="€"
          value={cfg.bgTransportEur.suv}
          onChange={(v) => patch({ bgTransportEur: { ...cfg.bgTransportEur, suv: v } })}
        />
        <Field
          label="Канада транспорт"
          suffix="$"
          value={cfg.caTransportUsd}
          onChange={(v) => patch({ caTransportUsd: v })}
        />
        <Field
          label="Канада (Бр. Колумбия) — седан"
          suffix="$"
          value={cfg.caTransportBcUsd.sedan}
          onChange={(v) => patch({ caTransportBcUsd: { ...cfg.caTransportBcUsd, sedan: v } })}
        />
        <Field
          label="Канада (Бр. Колумбия) — джип"
          suffix="$"
          value={cfg.caTransportBcUsd.suv}
          onChange={(v) => patch({ caTransportBcUsd: { ...cfg.caTransportBcUsd, suv: v } })}
        />
      </Section>

      <Section title="mobile.bg — надценка при публикуване">
        <Field
          label="Надценка върху крайната цена"
          suffix="%"
          max={100}
          value={cfg.mobilebgMarkupPct}
          onChange={(v) => patch({ mobilebgMarkupPct: v })}
        />
        <p className={`${ADMIN_HINT} @lg:col-span-2 @lg:self-end`}>
          Обявата в mobile.bg е продажба на дребно, а калкулаторът дава себестойността „до България“. Надценката се
          прилага върху крайната сума и определя цената в обявата. При 0% обявяваме на себестойност.
        </p>
      </Section>

      {/* Sticky: the form is long, so the save button and its result stay in
          reach wherever the edit was made. */}
      <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-card backdrop-blur-sm">
        {status.kind === "error" ? <AdminBanner tone="error">{status.message}</AdminBanner> : null}
        {status.kind === "ok" && !dirty ? (
          <AdminBanner tone="success">Запазено — калкулаторът и mobile.bg вече ползват новите стойности.</AdminBanner>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted" aria-live="polite">
            {dirty ? "Има незапазени промени." : "Няма незапазени промени."}
          </p>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="secondary"
              size="lg"
              disabled={!dirty || busy}
              onClick={() => {
                setCfg(initial);
                setStatus({ kind: "idle" });
              }}
            >
              Върни
            </AdminButton>
            <AdminButton type="submit" variant="primary" size="lg" disabled={busy}>
              {busy ? "Запазване…" : "Запази настройките"}
            </AdminButton>
          </div>
        </div>
      </div>
    </form>
  );
}
