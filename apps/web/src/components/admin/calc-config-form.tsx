"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type CalcConfig } from "@/data/import-rates";
import { updateCalcConfig } from "@/mutations/tariffs";

/**
 * Admin form for the calculator's business constants (fees, commission tiers,
 * transport legs, agency, technotest, duty/VAT/FX). Edits a single `CalcConfig`
 * object and submits it to `updateCalcConfig`. The 596-row CargoLoop shipping
 * table is NOT here — that's the separate paste-TSV control.
 */
type Status = { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string };

const INPUT =
  "w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-brand";

function Field({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </span>
      <input
        type="number"
        step={step}
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={INPUT}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-4">
      <legend className="px-1 text-sm font-black text-ink">{title}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function CalcConfigForm({ initial }: { initial: CalcConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<CalcConfig>(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  // Immutable nested update by shallow-cloning the touched branch.
  function patch(next: Partial<CalcConfig>) {
    setCfg((c) => ({ ...c, ...next }));
  }
  function setTier(idx: number, key: "maxPriceEur" | "commissionEur", v: number) {
    setCfg((c) => {
      const tiers = c.commissionTiers.map((t, i) => (i === idx ? { ...t, [key]: v } : t));
      return { ...c, commissionTiers: tiers };
    });
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
      setStatus({ kind: "error", message: "Грешка при запис. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Section title="Общи (мито, ДДС, курс)">
        <Field label="Мито" suffix="%" value={cfg.dutyPct} onChange={(v) => patch({ dutyPct: v })} step={0.5} />
        <Field label="ДДС" suffix="%" value={cfg.vatPct} onChange={(v) => patch({ vatPct: v })} step={0.5} />
        <Field label="Курс EUR→USD" value={cfg.eurUsd} onChange={(v) => patch({ eurUsd: v })} step={0.01} />
        <Field label="Технотест" suffix="€" value={cfg.technotestEur} onChange={(v) => patch({ technotestEur: v })} step={10} />
      </Section>

      <Section title="Корея — Плащане 1 (ENCAR + документи)">
        <Field label="ENCAR такса" suffix="€" value={cfg.krEncarFeeEur} onChange={(v) => patch({ krEncarFeeEur: v })} step={10} />
        <Field label="Документи" suffix="%" value={cfg.krDocsPct} onChange={(v) => patch({ krDocsPct: v })} step={0.1} />
      </Section>

      <Section title="Корея — морски транспорт (€)">
        <Field
          label="Седан"
          suffix="€"
          value={cfg.krTransportEur.sedan}
          onChange={(v) => patch({ krTransportEur: { ...cfg.krTransportEur, sedan: v } })}
          step={10}
        />
        <Field
          label="Джип / SUV"
          suffix="€"
          value={cfg.krTransportEur.suv}
          onChange={(v) => patch({ krTransportEur: { ...cfg.krTransportEur, suv: v } })}
          step={10}
        />
      </Section>

      <fieldset className="rounded-xl border border-line bg-white p-4">
        <legend className="px-1 text-sm font-black text-ink">Корея — комисионна (€)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cfg.commissionTiers.map((t, i) => (
            <label key={i} className="flex items-center gap-1.5">
              <span className="w-16 shrink-0 text-xs text-muted">до {t.maxPriceEur} €</span>
              <input
                type="number"
                step={50}
                min={0}
                value={t.commissionEur}
                onChange={(e) => setTier(i, "commissionEur", Number(e.target.value))}
                className={INPUT}
              />
            </label>
          ))}
          <Field
            label="Таван (над последния праг)"
            suffix="€"
            value={cfg.commissionCapEur}
            onChange={(v) => patch({ commissionCapEur: v })}
            step={100}
          />
        </div>
      </fieldset>

      <Section title="САЩ / Канада — аукционна такса">
        <Field label="Фикс. такса (≤ праг)" suffix="$" value={cfg.usAuctionFlatUsd} onChange={(v) => patch({ usAuctionFlatUsd: v })} step={10} />
        <Field label="Праг" suffix="$" value={cfg.usAuctionThresholdUsd} onChange={(v) => patch({ usAuctionThresholdUsd: v })} step={500} />
        <Field
          label="Copart над прага"
          suffix="%"
          value={cfg.usAuctionPct.copart * 100}
          onChange={(v) => patch({ usAuctionPct: { ...cfg.usAuctionPct, copart: v / 100 } })}
          step={0.1}
        />
        <Field
          label="IAAI над прага"
          suffix="%"
          value={cfg.usAuctionPct.iaai * 100}
          onChange={(v) => patch({ usAuctionPct: { ...cfg.usAuctionPct, iaai: v / 100 } })}
          step={0.1}
        />
      </Section>

      <Section title="САЩ / Канада — фиксирани такси ($)">
        <Field label="Title" suffix="$" value={cfg.usFixedFeesUsd.title} onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, title: v } })} />
        <Field label="Environmental" suffix="$" value={cfg.usFixedFeesUsd.environmental} onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, environmental: v } })} />
        <Field label="Re-invoicing" suffix="$" value={cfg.usFixedFeesUsd.reinvoicing} onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, reinvoicing: v } })} />
        <Field label="Онлайн наддаване" suffix="$" value={cfg.usFixedFeesUsd.onlineBid} onChange={(v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, onlineBid: v } })} />
      </Section>

      <Section title="След Холандия — агенция и автовоз до БГ (всички пазари)">
        <Field label="Митн. агенция" suffix="€" value={cfg.agencyEur} onChange={(v) => patch({ agencyEur: v })} step={10} />
        <Field label="Автовоз БГ — седан" suffix="€" value={cfg.bgTransportEur.sedan} onChange={(v) => patch({ bgTransportEur: { ...cfg.bgTransportEur, sedan: v } })} step={10} />
        <Field label="Автовоз БГ — джип" suffix="€" value={cfg.bgTransportEur.suv} onChange={(v) => patch({ bgTransportEur: { ...cfg.bgTransportEur, suv: v } })} step={10} />
        <Field label="Канада транспорт" suffix="$" value={cfg.caTransportUsd} onChange={(v) => patch({ caTransportUsd: v })} step={10} />
        <Field
          label="Канада (Бр. Колумбия) — седан"
          suffix="$"
          value={cfg.caTransportBcUsd.sedan}
          onChange={(v) => patch({ caTransportBcUsd: { ...cfg.caTransportBcUsd, sedan: v } })}
          step={10}
        />
        <Field
          label="Канада (Бр. Колумбия) — джип"
          suffix="$"
          value={cfg.caTransportBcUsd.suv}
          onChange={(v) => patch({ caTransportBcUsd: { ...cfg.caTransportBcUsd, suv: v } })}
          step={10}
        />
      </Section>

      {status.kind === "error" ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">{status.message}</p>
      ) : null}
      {status.kind === "ok" ? (
        <p className="rounded-lg bg-[#e8f5ec] px-3 py-2 text-sm font-semibold text-[#1d6b35]">
          Запазено — калкулаторът ще ползва новите стойности.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Запазване…" : "Запази настройките"}
        </button>
        <button
          type="button"
          onClick={() => setCfg(initial)}
          className="text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Върни
        </button>
      </div>
    </form>
  );
}
