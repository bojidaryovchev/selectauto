"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { AlertIcon, CircleCheckIcon, MailIcon, SendIcon } from "@/components/icons";
import type { ImportCostInputs } from "@/data/import-rates";
import {
  calculatorOfferContactSchema,
  type CalculatorOfferContactValues,
} from "@/schemas/calculator-offer.schema";
import type { ActionResult } from "@/types";

/**
 * The gated-offer lead form inside the estimator's result panel: name + phone +
 * email → the visitor receives the CURRENT breakdown as a branded email and the
 * lead lands in `calculator_offers` (docs/13-seo-action-plan.md Phase B).
 * Collapsed behind a button so the estimator stays a friction-free tool; the
 * form is the opt-in. Mirrors the carfax form's react-hook-form + zod pattern;
 * the server action recomputes the breakdown from `inputs`, so this form never
 * sends totals.
 *
 * Look (board `im-calc-offer`): the kit's fields with labels above them (the placeholders the code has always shown),
 * each error under its field, a server's message in an alert above the button — its first sentence in bold, the rest
 * under it, word for word — and the confirmation in place of the form.
 */

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

/** A message's first sentence and the rest, for an alert's bold line and the text under it („Готово!" / „Изпратихме…"). */
function splitMessage(message: string): { head: string; rest: string | null } {
  const m = /[.!?] /.exec(message);
  return m ? { head: message.slice(0, m.index + 1), rest: message.slice(m.index + 2) } : { head: message, rest: null };
}

/** An alert with the message's first sentence in bold (boards `im-calc-offer`, frames 6–9). */
function MessageAlert({ tone, message }: { tone: "pos" | "neg"; message: string }) {
  const { head, rest } = splitMessage(message);
  return (
    <div className={`sa-alert sa-alert--${tone} ${tone === "pos" ? "im-sent" : ""}`} role={tone === "pos" ? "status" : "alert"}>
      {tone === "pos" ? <CircleCheckIcon /> : <AlertIcon />}
      <div>
        <b>{head}</b>
        {rest ? <p>{rest}</p> : null}
      </div>
    </div>
  );
}

export function CalculatorOfferForm({ inputs }: { inputs: ImportCostInputs }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CalculatorOfferContactValues>({
    resolver: zodResolver(calculatorOfferContactSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  async function onSubmit(values: CalculatorOfferContactValues) {
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/calculator-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          inputs,
          page_url: window.location.href,
        }),
      });
      const result = (await res.json()) as ActionResult;
      if (result.success) {
        setStatus({
          kind: "success",
          message: "Готово! Изпратихме разбивката на имейла Ви. Ще се свържем с Вас и по телефона.",
        });
        reset();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Грешка при изпращане. Моля опитайте отново." });
    }
  }

  if (status.kind === "success") {
    return <MessageAlert tone="pos" message={status.message} />;
  }

  if (!open) {
    return (
      <Button variant="pri" block onClick={() => setOpen(true)} className="sa-btn--long">
        <MailIcon />
        Получете разбивката на имейл
      </Button>
    );
  }

  const field = (
    name: keyof CalculatorOfferContactValues,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => {
    const id = `${uid}-${name}`;
    const error = errors[name]?.message;
    return (
      <div className="sa-fld">
        <label className="sa-lbl" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          {...register(name)}
          {...props}
          className={`sa-in ${error ? "is-err" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {error ? (
          <span id={`${id}-err`} className="sa-err">
            <AlertIcon />
            {error}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="im-offer" noValidate>
      <p className="im-offer__h">
        <MailIcon />
        Получете тази разбивка на имейл
      </p>
      {field("name", "Име", { type: "text", autoComplete: "name" })}
      {field("phone", "Телефон (08…)", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
      {field("email", "Имейл", { type: "email", autoComplete: "email", inputMode: "email" })}

      {status.kind === "error" ? <MessageAlert tone="neg" message={status.message} /> : null}

      {/* While sending, the busy button stays at full strength (the kit dims a disabled one). */}
      <Button type="submit" variant="pri" block busy={isSubmitting} disabled={isSubmitting} className="opacity-100">
        {isSubmitting ? null : <SendIcon />}
        {isSubmitting ? "Изпращане…" : "Изпратете ми разбивката"}
      </Button>
      <p className="im-consent">С изпращането се съгласявате да се свържем с Вас относно калкулацията.</p>
    </form>
  );
}
