"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import { PrivacyNote } from "@/components/legal/privacy-note";
import { inquiryContactSchema, type InquiryContactValues } from "@/schemas/inquiry.schema";

/**
 * The quiz's last step (boards `ac-inq-desk`, `ac-inq-desk2`, `ac-inq-send`, `ac-zap-st`): „Вашето име" and „Телефон",
 * „Изпратете" and the privacy note, and the server's error under them. The only part of the quiz with validated fields,
 * so the only one that loads react-hook-form and zod (see load-contact-step.ts).
 *
 * `zodResolver(inquiryContactSchema)` normalises the phone (`08…` → `+359…`) as part of validation, so `onSubmit` gets
 * the `+359…` value `createInquiry` expects; RHF's `isSubmitting` holds the button's busy state while it runs. The
 * typed values go back to the quiz through `onKeep` when the step closes („Назад"), and come back as `defaults`, so
 * they are still there on the way forward.
 */
export function ContactStep({
  defaults,
  error,
  onSubmit,
  onKeep,
}: {
  defaults: InquiryContactValues;
  /** The server's (or the connection's) error, shown under the button. */
  error: string;
  onSubmit: (values: InquiryContactValues) => Promise<void>;
  onKeep: (values: InquiryContactValues) => void;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InquiryContactValues>({
    resolver: zodResolver(inquiryContactSchema),
    defaultValues: defaults,
  });

  const keep = useRef(onKeep);
  useEffect(() => {
    keep.current = onKeep;
  });
  useEffect(() => () => keep.current(getValues()), [getValues]);

  const nameError = errors.name?.message;
  const phoneError = errors.phone?.message;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="ac-iqform animate-[saFadeIn_0.28s_ease] motion-reduce:animate-none"
    >
      <div className="sa-fld">
        <label htmlFor="sa-quiz-name" className="sa-lbl">
          Вашето име
        </label>
        <input
          id="sa-quiz-name"
          type="text"
          placeholder="Име"
          autoComplete="name"
          enterKeyHint="next"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "sa-quiz-name-err" : undefined}
          className={`sa-in ${nameError ? "is-err" : ""}`}
          {...register("name")}
        />
        {nameError ? (
          <span id="sa-quiz-name-err" className="sa-err">
            <AlertIcon />
            {nameError}
          </span>
        ) : null}
      </div>
      <div className="sa-fld">
        <label htmlFor="sa-quiz-phone" className="sa-lbl">
          Телефон
        </label>
        <input
          id="sa-quiz-phone"
          type="tel"
          placeholder="+359XXXXXXXXX"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="done"
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={phoneError ? "sa-quiz-phone-err" : undefined}
          className={`sa-in ${phoneError ? "is-err" : ""}`}
          {...register("phone")}
        />
        {phoneError ? (
          <span id="sa-quiz-phone-err" className="sa-err">
            <AlertIcon />
            {phoneError}
          </span>
        ) : null}
      </div>

      {/* While sending, the button keeps its full strength (the kit dims a disabled one). */}
      <Button
        type="submit"
        variant="pri"
        size="xl"
        block
        busy={isSubmitting}
        disabled={isSubmitting}
        className="opacity-100"
      >
        {isSubmitting ? "Изпращаме заявката..." : "Изпратете"}
      </Button>
      <PrivacyNote />

      {error ? (
        <div className="sa-alert sa-alert--neg" role="alert">
          <AlertIcon />
          <div>{error}</div>
        </div>
      ) : null}
    </form>
  );
}
