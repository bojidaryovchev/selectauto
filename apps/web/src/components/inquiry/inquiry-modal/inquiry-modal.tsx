"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, IconButton, MakePlate } from "@/components/common";
import { INQUIRY_LOGO } from "@/constants";
import { AlertIcon, CheckIcon, ChevronLeftIcon, CloseIcon } from "@/components/icons";
import {
  INQUIRY_BRAND_LOGOS,
  INQUIRY_BRANDS,
  INQUIRY_BUDGETS,
  INQUIRY_FINANCE,
  INQUIRY_TIMES,
} from "@/data/inquiry-brands";
import { inquiryContactSchema, type InquiryContactValues } from "@/schemas/inquiry.schema";
import type { ActionResult, InquiryPrefill } from "@/types";
import { QuizOption } from "./quiz-option";
import { QuizStep } from "./quiz-step";

/**
 * Site-wide "Безплатна консултация" modal wizard (boards `ac-inq-desk`, `ac-inq-desk2`, `ac-inq-quiz`, `ac-inq-send`,
 * `ac-inq-tab`; parity check docs/design/parity/inquiry.md). Rendered once near the root and opened by any
 * "Запитване" button via the `useInquiry()` context.
 *
 * Flow: a start screen → seven quiz steps (specific model? → brand → model →
 * budget → time → finance → name/phone) → a success step that auto-closes.
 * Answering "Не" to the first question skips the brand/model steps and jumps
 * straight to budget.
 *
 * Opened from a car page with a `prefill` (brand+model), it pre-answers the
 * specific-model/brand/model steps and starts at the budget step, showing a banner
 * that names the car — the buyer only fills in budget/time/finance + name/phone.
 *
 * The look: a 560 px dialog at the top of the screen (it doesn't jump as the steps change height), full screen on a
 * phone; the step bar with „Назад", „Стъпка N от M" over the kit's segments and „Затворете". Focus moves into the
 * dialog on open, to each new question, and back to what opened it on close.
 *
 * Quiz option data lives in `@/data/inquiry-brands`; phone helpers in
 * `@/lib/phone`.
 */

type Screen = "start" | "quiz";
type QuizData = {
  specific_model?: string;
  brand?: string;
  model?: string;
  budget?: string;
  time?: string;
  finance?: string;
  name?: string;
  phone?: string;
};

/** Budget is step 3 — the first step a car prefill leaves for the buyer to answer. */
const BUDGET_STEP = 3;

export function InquiryModal({
  isOpen,
  onClose,
  prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  prefill?: InquiryPrefill;
}) {
  const [screen, setScreen] = useState<Screen>("start");
  const [step, setStep] = useState(0); // 0..7 within the quiz
  const [data, setData] = useState<QuizData>({});
  // Server-side submit error (createInquiry failure); field-level validation for
  // name/phone is handled by react-hook-form below.
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Only the final step's name/phone are validated fields — the quiz answers are
  // button taps stored in `data`. `zodResolver(inquiryContactSchema)` normalises
  // the phone (`08…` → `+359…`) as part of validation, so `onSubmit` gets the same
  // `+359…` value `createInquiry` expects.
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryContactValues>({
    resolver: zodResolver(inquiryContactSchema),
    defaultValues: { name: "", phone: "" },
  });

  // A car page opens the modal knowing the brand+model → pre-answer those steps.
  const isCarPrefill = Boolean(prefill?.brand && prefill?.model);
  // The earliest reachable step: a prefill can't go back past budget (brand/model
  // are fixed), so its back button floors at BUDGET_STEP.
  const floorStep = isCarPrefill ? BUDGET_STEP : 0;
  const bannerLabel =
    prefill?.carLabel ?? [prefill?.brand, prefill?.model].filter(Boolean).join(" ");

  // Seed the modal on the open transition (setState-during-render — React's
  // "adjust state when a prop changes" pattern, so there's no flash of the wrong
  // screen). A car prefill jumps straight to the budget step with brand/model
  // pre-answered; otherwise it's the generic start screen. This also resets any
  // leftover state from a previous open, so `close()` needn't reset.
  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setError("");
      if (isCarPrefill) {
        setScreen("quiz");
        setStep(BUDGET_STEP);
        setData({ specific_model: "Да", brand: prefill!.brand, model: prefill!.model });
      } else {
        setScreen("start");
        setStep(0);
        setData({});
      }
    }
  }

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  // Focus into the dialog on open, and back to whatever opened it on close.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => opener?.focus();
  }, [isOpen]);

  // Each new step: its question takes the focus (the answer that was pressed is gone); a step without one, the dialog.
  useEffect(() => {
    if (!isOpen) return;
    const question = dialogRef.current?.querySelector<HTMLElement>("[data-iq-focus]");
    (question ?? dialogRef.current)?.focus();
  }, [isOpen, screen, step]);

  // Clear the name/phone fields whenever the modal (re)opens. Done in an effect,
  // not the render-time seeding above, because RHF's `reset` must not run during
  // render — and the name/phone step is never the opening step, so there's no flash.
  useEffect(() => {
    if (isOpen) reset({ name: "", phone: "" });
  }, [isOpen, reset]);

  if (!isOpen) return null;

  function pick(key: keyof QuizData, value: string, skip = false) {
    setData((d) => ({ ...d, [key]: value }));

    if (key === "specific_model") {
      // "Не"/skip jumps past brand+model straight to budget (step 3).
      setStep(value === "Не" || skip ? 3 : 1);
      return;
    }
    if (key === "brand") {
      setStep(2);
      return;
    }
    if (key === "model") {
      setStep(3);
      return;
    }
    if (key === "budget") {
      setStep(4);
      return;
    }
    if (key === "time") {
      setStep(5);
      return;
    }
    if (key === "finance") {
      setStep(6);
    }
  }

  function back() {
    setError("");
    // Car prefill: brand/model are fixed, so back never leaves the qualification
    // steps — it floors at the budget step.
    if (isCarPrefill) {
      setStep((s) => Math.max(floorStep, s - 1));
      return;
    }
    if (step === 0) {
      setScreen("start");
      return;
    }
    // Step 3 (budget) may have been reached via the skip path; go back to step 0.
    if (step === 3 && (data.specific_model === "Не" || !data.brand)) {
      setStep(0);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  // `values` is validated + normalised by `inquiryContactSchema` (zodResolver), so
  // `name` is trimmed/non-empty and `phone` is already in `+359…` form. RHF's
  // `isSubmitting` drives the button's pending state.
  async function onSubmit(values: InquiryContactValues) {
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          specific_model: data.specific_model,
          brand: data.brand,
          model: data.model,
          budget: data.budget,
          time: data.time,
          finance: data.finance,
          page_url: window.location.href,
        }),
      });
      const result = (await res.json()) as ActionResult;

      if (result.success) {
        setStep(7); // success
        window.setTimeout(close, 2200);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Грешка при изпращане. Моля, опитайте отново.");
    }
  }

  // The back arrow shows on quiz steps beyond the floor (not on the first reachable
  // step or the success step) — matching theme.js `showStep`, with a car prefill's
  // budget step treated as its floor.
  const showBack = screen === "quiz" && step > floorStep && step < 7;

  // The ordered steps for the current path — drives the "Стъпка N от M" progress.
  // Full quiz vs. the "Не" skip vs. a car prefill (brand/model pre-answered).
  const stepFlow = isCarPrefill
    ? [3, 4, 5, 6]
    : data.specific_model === "Не"
      ? [0, 3, 4, 5, 6]
      : [0, 1, 2, 3, 4, 5, 6];
  const stepIndex = stepFlow.indexOf(step);
  // Progress is shown on the quiz screen for the answered steps (not on success).
  const showProgress = screen === "quiz" && step < 7 && stepIndex >= 0;

  const nameError = errors.name?.message;
  const phoneError = errors.phone?.message;

  return (
    <div className="fixed inset-0 z-99999 flex items-start justify-center px-6 pt-18 pb-6 max-sm:p-0">
      {/* The dimmed page; a press on it closes the dialog. */}
      <div onClick={close} className="sa-scrim" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Безплатна консултация"
        className="ac-iqd max-h-[min(792px,calc(100dvh-96px))] outline-none max-sm:max-h-none"
      >
        {/* The header stays put while the body scrolls (the make and model lists are long on a phone). */}
        <div className="ac-iq__h">
          <div className="ac-iq__bar">
            {showBack ? (
              <IconButton label="Назад" onClick={back}>
                <ChevronLeftIcon />
              </IconButton>
            ) : null}
            {showProgress ? (
              <div className="ac-iq__p">
                <span className="sa-label">
                  Стъпка {stepIndex + 1} от {stepFlow.length}
                </span>
                <div className="sa-steps" aria-hidden="true">
                  {stepFlow.map((s, i) => (
                    <i key={s} className={i <= stepIndex ? "is-on" : undefined} />
                  ))}
                </div>
              </div>
            ) : (
              <span className="ac-iq__sp" />
            )}
            <IconButton label="Затворете" onClick={close}>
              <CloseIcon />
            </IconButton>
          </div>

          {/* The car the inquiry is about (prefill only). */}
          {isCarPrefill && bannerLabel ? (
            <div className="ac-iqcar">
              <MakePlate name={prefill!.brand!} logo={prefill?.makeLogo ?? null} size="sm" />
              <div>
                <span className="sa-label">Запитване за</span>
                <b>{bannerLabel}</b>
                {prefill?.lotNumber ? (
                  <span className="ac-iqcar__lot">
                    · Лот № <span className="sa-mono">{prefill.lotNumber}</span>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ac-iq__b">
          {/* Start screen */}
          {screen === "start" && (
            <div className="ac-iqs">
              {/* Dimensions come from INQUIRY_LOGO so they track the file's real 758×497
                  ratio — see the constant for why a wrong ratio resizes this box on load.
                  The element only exists once the modal opens, so it is fetched eagerly at
                  high priority rather than lazily; InquiryProvider has usually already
                  warmed it during idle, making this a cache hit. Next 16's `preload` prop
                  is deliberately NOT used: it inserts a <head> link, useless for an element
                  that does not exist until open, and the docs say not to pair it with
                  `fetchPriority`. */}
              <Image
                src={INQUIRY_LOGO.src}
                alt="SelectAuto"
                width={INQUIRY_LOGO.width}
                height={INQUIRY_LOGO.height}
                unoptimized
                loading="eager"
                fetchPriority="high"
              />
              <h2 className="ac-iqs__t">Безплатна консултация</h2>
              <p>
                SelectAuto е вашият надежден партньор при избора, закупуването и доставката на мечтания автомобил от
                Корея, САЩ и Канада.
              </p>
              <Button variant="pri" size="xl" block onClick={() => setScreen("quiz")}>
                Започнете консултация
              </Button>
            </div>
          )}

          {/* Quiz */}
          {screen === "quiz" && step === 0 && (
            <QuizStep title="Търсите ли конкретен модел?">
              <QuizOption onClick={() => pick("specific_model", "Да")}>Да</QuizOption>
              <QuizOption onClick={() => pick("specific_model", "Не", true)}>Не</QuizOption>
            </QuizStep>
          )}

          {screen === "quiz" && step === 1 && (
            <QuizStep title="Изберете марка" list="makes">
              {Object.keys(INQUIRY_BRANDS).map((brand) => (
                <QuizOption
                  key={brand}
                  kind="make"
                  logo={INQUIRY_BRAND_LOGOS[brand] ?? null}
                  onClick={() => pick("brand", brand)}
                >
                  {brand}
                </QuizOption>
              ))}
            </QuizStep>
          )}

          {screen === "quiz" && step === 2 && (
            <QuizStep title="Изберете модел" list="models">
              {(data.brand ? INQUIRY_BRANDS[data.brand] : []).map((model) => (
                <QuizOption key={model} kind="model" onClick={() => pick("model", model)}>
                  {model}
                </QuizOption>
              ))}
            </QuizStep>
          )}

          {screen === "quiz" && step === 3 && (
            <QuizStep title="Бюджет?">
              {INQUIRY_BUDGETS.map((b) => (
                <QuizOption key={b} onClick={() => pick("budget", b)}>
                  {b}
                </QuizOption>
              ))}
            </QuizStep>
          )}

          {screen === "quiz" && step === 4 && (
            <QuizStep title="До колко време искате да закупите автомобил?">
              {INQUIRY_TIMES.map((t) => (
                <QuizOption key={t} onClick={() => pick("time", t)}>
                  {t}
                </QuizOption>
              ))}
            </QuizStep>
          )}

          {screen === "quiz" && step === 5 && (
            <QuizStep title="Как ще финансирате автомобила?">
              {INQUIRY_FINANCE.map((f) => (
                <QuizOption key={f} onClick={() => pick("finance", f)}>
                  {f}
                </QuizOption>
              ))}
            </QuizStep>
          )}

          {/* Step 6 — name / phone */}
          {screen === "quiz" && step === 6 && (
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

              {error ? (
                <div className="sa-alert sa-alert--neg" role="alert">
                  <AlertIcon />
                  <div>{error}</div>
                </div>
              ) : null}
            </form>
          )}

          {/* Step 7 — success */}
          {screen === "quiz" && step === 7 && (
            <div className="ac-iqok animate-[saFadeIn_0.28s_ease] motion-reduce:animate-none" role="status">
              <span className="ac-iqok__ic" aria-hidden="true">
                <CheckIcon />
              </span>
              <h2>Благодарим!</h2>
              <p>Вашата заявка е приета. Ще се свържем с вас скоро.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
