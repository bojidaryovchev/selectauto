"use client";

import { ADMIN_INPUT, AdminBanner, AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { AlertIcon, Undo2Icon } from "@/components/icons";
import { type CalcConfig } from "@/data/import-rates";
import { updateCalcConfig } from "@/mutations/tariffs";
import { calcConfigSchema } from "@/schemas/calc-config.schema";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

/**
 * Admin form for the calculator's business constants (fees, commission tiers,
 * transport legs, agency, technotest, duty/VAT/FX). Edits a single `CalcConfig`
 * object and submits it to `updateCalcConfig`. The 596-row CargoLoop shipping
 * table is NOT here — that's the separate paste-TSV control. Boards `ab-tariffs`
 * and its states; parity check docs/design/parity/admin-tariffs.md.
 *
 * The server's own schema runs here first (`noValidate`): each message sits under
 * its field, the field outlined, and nothing is sent until they all pass. It used
 * to be the browser's bubble for `min`/`max`/`required`; the server re-checks.
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

/** A copy of `obj` with the value at a dotted path („krTransportEur.sedan", „commissionTiers.0.commissionEur") unset. */
function withoutPath<T>(obj: T, path: string): T {
  const copy = structuredClone(obj) as Record<string, unknown>;
  const keys = path.split(".");
  let node: Record<string, unknown> = copy;
  for (const k of keys.slice(0, -1)) node = node[k] as Record<string, unknown>;
  node[keys[keys.length - 1]] = undefined;
  return copy as T;
}

function Field({
  label,
  value,
  onChange,
  draft,
  onDraft,
  error,
  suffix,
  min = 0,
  max = 1_000_000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** The text being typed, when it isn't the value yet (null otherwise). */
  draft: string | null;
  /** Typing (the raw text), or leaving the field (null). */
  onDraft: (raw: string | null) => void;
  error?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div className="ab-fld">
      <label htmlFor={id} className="sa-lbl">
        {label}
        {suffix ? <em> ({suffix})</em> : null}
      </label>
      {/* step="any": the browser refuses a value off the input's step, and the
          BC jeep default 3185 against step 10 once made the whole form unsavable.
          min/max mirror the server's limits for the spinner and assistive tech;
          the schema below is the check. Clearing a field used to save it as 0 (a
          VAT of 0 % on every quote); now an empty field keeps its value and gets it
          back on leaving it. */}
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
          onDraft(raw);
          if (raw === "") return;
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => onDraft(null)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${ADMIN_INPUT} ${error ? "is-err" : ""}`}
      />
      {error ? (
        <span id={`${id}-err`} className="sa-err">
          <AlertIcon />
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AdminCard>
      <fieldset>
        <legend>{title}</legend>
        <div className="ab-cfgg">{children}</div>
      </fieldset>
    </AdminCard>
  );
}

export function CalcConfigForm({ initial }: { initial: CalcConfig }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cfg, setCfg] = useState<CalcConfig>(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  // By the value's path: the text being typed, and the schema's message.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = canonical(cfg) !== canonical(initial);

  /** What a field needs from the form, by its value's path. Typing in it clears its message; leaving it doesn't. */
  function bind(path: string) {
    return {
      draft: drafts[path] ?? null,
      error: errors[path],
      onDraft: (raw: string | null) => {
        setDrafts((d) => {
          const next = { ...d };
          if (raw === null) delete next[path];
          else next[path] = raw;
          return next;
        });
        // Leaving the field keeps its message — unless it was left empty: then its saved value is back.
        if (raw === null && drafts[path]?.trim() !== "") return;
        setErrors((e) => {
          if (!(path in e)) return e;
          const next = { ...e };
          delete next[path];
          return next;
        });
      },
    };
  }

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

  // The values the form shows, by path — filled as the fields render below.
  const formPaths = new Set<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // A field left empty is no number — the schema's „…: въведете число.", where `required` used to stop the save.
    let candidate = cfg;
    for (const [path, raw] of Object.entries(drafts)) if (raw.trim() === "") candidate = withoutPath(candidate, path);
    const parsed = calcConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      let unplaced: string | null = null;
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        // A message whose field is on the form goes under it; any other (a guard for a forged request) in the bar.
        if (formPaths.has(path)) next[path] ??= issue.message;
        else unplaced ??= issue.message;
      }
      setErrors(next);
      setStatus(unplaced ? { kind: "error", message: unplaced } : { kind: "idle" });
      // As the browser's bubble did: to the first field that needs a look.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
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

  /** A field bound to the value at `path`. */
  const f = (path: string, props: Omit<React.ComponentProps<typeof Field>, "draft" | "onDraft" | "error">) => {
    formPaths.add(path);
    return <Field key={path} {...props} {...bind(path)} />;
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="ab-cfg">
      <Section title="Общи (мито, ДДС, курс)">
        {f("dutyPct", { label: "Мито", suffix: "%", max: 100, value: cfg.dutyPct, onChange: (v) => patch({ dutyPct: v }) })}
        {f("vatPct", { label: "ДДС", suffix: "%", max: 100, value: cfg.vatPct, onChange: (v) => patch({ vatPct: v }) })}
        {f("eurUsd", { label: "Курс EUR→USD", min: 0.1, max: 10, value: cfg.eurUsd, onChange: (v) => patch({ eurUsd: v }) })}
        {f("technotestEur", {
          label: "Технотест",
          suffix: "€",
          value: cfg.technotestEur,
          onChange: (v) => patch({ technotestEur: v }),
        })}
      </Section>

      <Section title="Корея — Плащане 1 (ENCAR + документи)">
        {f("krEncarFeeEur", {
          label: "ENCAR такса",
          suffix: "€",
          value: cfg.krEncarFeeEur,
          onChange: (v) => patch({ krEncarFeeEur: v }),
        })}
        {f("krDocsPct", {
          label: "Документи",
          suffix: "%",
          max: 100,
          value: cfg.krDocsPct,
          onChange: (v) => patch({ krDocsPct: v }),
        })}
      </Section>

      <Section title="Корея — морски транспорт">
        {f("krTransportEur.sedan", {
          label: "Седан",
          suffix: "€",
          value: cfg.krTransportEur.sedan,
          onChange: (v) => patch({ krTransportEur: { ...cfg.krTransportEur, sedan: v } }),
        })}
        {f("krTransportEur.suv", {
          label: "Джип / SUV",
          suffix: "€",
          value: cfg.krTransportEur.suv,
          onChange: (v) => patch({ krTransportEur: { ...cfg.krTransportEur, suv: v } }),
        })}
      </Section>

      <Section title="Корея — комисионна (€)">
        {cfg.commissionTiers.map((t, i) =>
          f(`commissionTiers.${i}.commissionEur`, {
            label: `При цена до ${eur(t.maxPriceEur)} €`,
            value: t.commissionEur,
            onChange: (v) => setTier(i, v),
          }),
        )}
        {f("commissionCapEur", {
          label: "Над последния праг",
          value: cfg.commissionCapEur,
          onChange: (v) => patch({ commissionCapEur: v }),
        })}
      </Section>

      <Section title="САЩ / Канада — аукционна такса">
        {f("usAuctionFlatUsd", {
          label: "Фикс. такса (≤ праг)",
          suffix: "$",
          value: cfg.usAuctionFlatUsd,
          onChange: (v) => patch({ usAuctionFlatUsd: v }),
        })}
        {f("usAuctionThresholdUsd", {
          label: "Праг",
          suffix: "$",
          value: cfg.usAuctionThresholdUsd,
          onChange: (v) => patch({ usAuctionThresholdUsd: v }),
        })}
        {f("usAuctionPct.copart", {
          label: "Copart над прага",
          suffix: "%",
          max: 100,
          value: roundPct(cfg.usAuctionPct.copart * 100),
          onChange: (v) => patch({ usAuctionPct: { ...cfg.usAuctionPct, copart: roundPct(v / 100) } }),
        })}
        {f("usAuctionPct.iaai", {
          label: "IAAI над прага",
          suffix: "%",
          max: 100,
          value: roundPct(cfg.usAuctionPct.iaai * 100),
          onChange: (v) => patch({ usAuctionPct: { ...cfg.usAuctionPct, iaai: roundPct(v / 100) } }),
        })}
      </Section>

      <Section title="САЩ / Канада — фиксирани такси">
        {f("usFixedFeesUsd.title", {
          label: "Title",
          suffix: "$",
          value: cfg.usFixedFeesUsd.title,
          onChange: (v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, title: v } }),
        })}
        {f("usFixedFeesUsd.environmental", {
          label: "Environmental",
          suffix: "$",
          value: cfg.usFixedFeesUsd.environmental,
          onChange: (v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, environmental: v } }),
        })}
        {f("usFixedFeesUsd.reinvoicing", {
          label: "Re-invoicing",
          suffix: "$",
          value: cfg.usFixedFeesUsd.reinvoicing,
          onChange: (v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, reinvoicing: v } }),
        })}
        {f("usFixedFeesUsd.onlineBid", {
          label: "Онлайн наддаване",
          suffix: "$",
          value: cfg.usFixedFeesUsd.onlineBid,
          onChange: (v) => patch({ usFixedFeesUsd: { ...cfg.usFixedFeesUsd, onlineBid: v } }),
        })}
      </Section>

      <Section title="След Холандия — агенция и автовоз до БГ (всички пазари)">
        {f("agencyEur", { label: "Митн. агенция", suffix: "€", value: cfg.agencyEur, onChange: (v) => patch({ agencyEur: v }) })}
        {f("bgTransportEur.sedan", {
          label: "Автовоз БГ — седан",
          suffix: "€",
          value: cfg.bgTransportEur.sedan,
          onChange: (v) => patch({ bgTransportEur: { ...cfg.bgTransportEur, sedan: v } }),
        })}
        {f("bgTransportEur.suv", {
          label: "Автовоз БГ — джип",
          suffix: "€",
          value: cfg.bgTransportEur.suv,
          onChange: (v) => patch({ bgTransportEur: { ...cfg.bgTransportEur, suv: v } }),
        })}
        {f("caTransportUsd", {
          label: "Канада транспорт",
          suffix: "$",
          value: cfg.caTransportUsd,
          onChange: (v) => patch({ caTransportUsd: v }),
        })}
        {f("caTransportBcUsd.sedan", {
          label: "Канада (Бр. Колумбия) — седан",
          suffix: "$",
          value: cfg.caTransportBcUsd.sedan,
          onChange: (v) => patch({ caTransportBcUsd: { ...cfg.caTransportBcUsd, sedan: v } }),
        })}
        {f("caTransportBcUsd.suv", {
          label: "Канада (Бр. Колумбия) — джип",
          suffix: "$",
          value: cfg.caTransportBcUsd.suv,
          onChange: (v) => patch({ caTransportBcUsd: { ...cfg.caTransportBcUsd, suv: v } }),
        })}
      </Section>

      <Section title="mobile.bg — надценка при публикуване">
        {f("mobilebgMarkupPct", {
          label: "Надценка върху крайната цена",
          suffix: "%",
          max: 100,
          value: cfg.mobilebgMarkupPct,
          onChange: (v) => patch({ mobilebgMarkupPct: v }),
        })}
        <p className="ab-hint ab-span self-end">
          Обявата в mobile.bg е продажба на дребно, а калкулаторът дава себестойността „до България“. Надценката се
          прилага върху крайната сума и определя цената в обявата. При 0% обявяваме на себестойност.
        </p>
      </Section>

      {/* Sticky: the form is long, so the save button and its result stay in
          reach wherever the edit was made. */}
      <div className="ab-dock ab-dock--stick bottom-[calc(10px+env(safe-area-inset-bottom))]">
        {status.kind === "error" ? (
          <AdminBanner tone="error" className="ab-al">
            {status.message}
          </AdminBanner>
        ) : null}
        {status.kind === "ok" && !dirty ? (
          <AdminBanner tone="success" className="ab-al">
            Запазено — калкулаторът и mobile.bg вече ползват новите стойности.
          </AdminBanner>
        ) : null}
        <div className="ab-dock__r">
          <p className="ab-dirty" aria-live="polite">
            {dirty ? "Има незапазени промени." : "Няма незапазени промени."}
          </p>
          <div className="ab-dock__acts">
            <Button
              variant="sec"
              size="md"
              disabled={!dirty || busy}
              onClick={() => {
                setCfg(initial);
                setDrafts({});
                setErrors({});
                setStatus({ kind: "idle" });
              }}
            >
              <Undo2Icon />
              Върнете
            </Button>
            <Button type="submit" variant="pri" size="md" disabled={busy} busy={busy}>
              {busy ? "Запазване…" : "Запазете настройките"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
