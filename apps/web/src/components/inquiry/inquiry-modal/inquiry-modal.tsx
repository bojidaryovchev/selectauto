"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { ChevronLeftIcon, CloseIcon } from "@/components/icons";
import {
  INQUIRY_BRANDS,
  INQUIRY_BUDGETS,
  INQUIRY_FINANCE,
  INQUIRY_TIMES,
} from "@/data/inquiry-brands";
import { createInquiry } from "@/mutations/inquiries";
import { inquiryContactSchema, type InquiryContactValues } from "@/schemas/inquiry.schema";
import type { InquiryPrefill } from "@/types";
import { MainButton } from "./main-button";
import { QuizOption } from "./quiz-option";
import { QuizStep } from "./quiz-step";

/**
 * Site-wide "Безплатна консултация" modal wizard, ported 1:1 from the original
 * WordPress theme (`#sa-inquiry-modal` in footer.php + the quiz logic in
 * theme.js). It is rendered once near the root and opened by any "Запитване"
 * button via the `useInquiry()` context.
 *
 * Flow: a start screen → seven quiz steps (specific model? → brand → model →
 * budget → time → finance → name/phone) → a success step that auto-closes.
 * Answering "Не" to the first question skips the brand/model steps and jumps
 * straight to budget, exactly like the original `data-skip="1"` branch.
 *
 * Opened from a car page with a `prefill` (brand+model), it pre-answers the
 * specific-model/brand/model steps and starts at the budget step, showing a banner
 * that names the car — the buyer only fills in budget/time/finance + name/phone.
 *
 * Quiz option data lives in `@/data/inquiry-brands`; phone helpers in
 * `@/lib/phone`.
 */

const LOGO =
  "https://selectauto.bg/wp-content/uploads/2025/09/autoselect-e1760829297592.jpg";

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
      const result = await createInquiry({
        name: values.name,
        phone: values.phone,
        specific_model: data.specific_model,
        brand: data.brand,
        model: data.model,
        budget: data.budget,
        time: data.time,
        finance: data.finance,
        page_url: window.location.href,
      });

      if (result.success) {
        setStep(7); // success
        window.setTimeout(close, 2200);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Грешка при изпращане. Моля опитай отново.");
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
  const progressPct = ((stepIndex + 1) / stepFlow.length) * 100;

  return (
    <div
      className="fixed inset-0 z-99999"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sa-inquiry-title"
    >
      {/* Backdrop */}
      <div
        onClick={close}
        className="absolute inset-0 bg-[rgba(8,10,14,0.72)] backdrop-blur-lg"
      />

      {/* Dialog — a flex column: a PINNED header (back + close + progress + car
          banner) that never scrolls, over a scrollable body. The scroll used to
          live on this whole box with the close button `absolute` inside it, so on
          tall steps (the brand/model lists) the header scrolled out of view.
          On phones (≤640px) it fills the whole viewport — edge-to-edge, square
          corners, `h-dvh` (tracks the URL bar / keyboard) — with the header/body
          padding honouring the notch + home-indicator safe-area insets. From 641px
          up it's the centred card. */}
      <div className="relative z-2 mx-auto mt-[5vh] flex max-h-[min(88vh,820px)] w-[min(100%-24px,520px)] flex-col overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,250,0.98)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md max-[640px]:mt-0 max-[640px]:h-dvh max-[640px]:max-h-dvh max-[640px]:w-full max-[640px]:rounded-none max-[640px]:shadow-none">
        {/* Pinned header */}
        <div className="shrink-0 px-7 pt-5 max-[640px]:px-4.5 max-[640px]:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-2">
            {showBack ? (
              <Button
                onClick={back}
                aria-label="Назад"
                className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[#f1f2f4] text-[#6f747c] transition-all duration-200 hover:-translate-y-px hover:bg-[#e8eaee] hover:text-[#17181b]"
              >
                <ChevronLeftIcon className="size-5" />
              </Button>
            ) : (
              <span />
            )}
            <Button
              aria-label="Затвори"
              onClick={close}
              className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[#f1f2f4] text-[#6f747c] transition-all duration-200 hover:-translate-y-px hover:bg-[#e8eaee] hover:text-[#17181b]"
            >
              <CloseIcon className="size-4.5" />
            </Button>
          </div>

          {/* Step progress */}
          {showProgress && (
            <div className="mt-3">
              <p className="mb-1.5 text-[12px] font-semibold text-[#8a8f98]">
                Стъпка {stepIndex + 1} от {stepFlow.length}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ececef]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#b95200,#d86f16)] transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Car context banner (prefill only) */}
          {isCarPrefill && bannerLabel && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[14px] bg-brand/8 px-3.5 py-2.5 ring-1 ring-brand/15">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#a5641f]">
                Запитване за
              </span>
              <span className="text-[14px] font-extrabold text-[#17181b]">{bannerLabel}</span>
              {prefill?.lotNumber ? (
                <span className="text-[12px] font-semibold text-[#8a8f98]">
                  · Лот № {prefill.lotNumber}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-7 pb-6.5 pt-4 max-[640px]:px-4.5 max-[640px]:pb-[max(1.125rem,env(safe-area-inset-bottom))]">
        {/* Start screen */}
        {screen === "start" && (
          <div>
            <Image
              src={LOGO}
              alt="SelectAuto"
              width={150}
              height={62}
              unoptimized
              className="mx-auto mb-3.5 block max-w-37.5 rounded-[10px] max-[640px]:max-w-32.5"
            />
            <h2
              id="sa-inquiry-title"
              className="mb-3 text-center text-[28px] font-extrabold text-[#17181b] max-[640px]:text-2xl"
            >
              Безплатна консултация
            </h2>
            <p className="mx-auto mb-4.5 text-center text-[15px] leading-[1.65] text-[#555962]">
              SelectAuto е вашият надежден партньор при избора, закупуването и
              доставката на мечтания автомобил от Европа, САЩ и Канада.
            </p>
            <MainButton onClick={() => setScreen("quiz")}>
              Започни консултация
            </MainButton>
          </div>
        )}

        {/* Quiz */}
        {screen === "quiz" && (
          <div>
            {/* Step 0 — specific model? */}
            {step === 0 && (
              <QuizStep title="Търсите ли конкретен модел?">
                <QuizOption onClick={() => pick("specific_model", "Да")}>Да</QuizOption>
                <QuizOption onClick={() => pick("specific_model", "Не", true)}>
                  Не
                </QuizOption>
              </QuizStep>
            )}

            {/* Step 1 — brand */}
            {step === 1 && (
              <QuizStep title="Изберете марка">
                {Object.keys(INQUIRY_BRANDS).map((brand) => (
                  <QuizOption key={brand} onClick={() => pick("brand", brand)}>
                    {brand}
                  </QuizOption>
                ))}
              </QuizStep>
            )}

            {/* Step 2 — model */}
            {step === 2 && (
              <QuizStep title="Изберете модел">
                {(data.brand ? INQUIRY_BRANDS[data.brand] : []).map((model) => (
                  <QuizOption key={model} onClick={() => pick("model", model)}>
                    {model}
                  </QuizOption>
                ))}
              </QuizStep>
            )}

            {/* Step 3 — budget */}
            {step === 3 && (
              <QuizStep title="Бюджет?">
                {INQUIRY_BUDGETS.map((b) => (
                  <QuizOption key={b} onClick={() => pick("budget", b)}>
                    {b}
                  </QuizOption>
                ))}
              </QuizStep>
            )}

            {/* Step 4 — time */}
            {step === 4 && (
              <QuizStep title="До колко време искате да закупите автомобил?">
                {INQUIRY_TIMES.map((t) => (
                  <QuizOption key={t} onClick={() => pick("time", t)}>
                    {t}
                  </QuizOption>
                ))}
              </QuizStep>
            )}

            {/* Step 5 — finance */}
            {step === 5 && (
              <QuizStep title="Как ще финансирате автомобила?">
                {INQUIRY_FINANCE.map((f) => (
                  <QuizOption key={f} onClick={() => pick("finance", f)}>
                    {f}
                  </QuizOption>
                ))}
              </QuizStep>
            )}

            {/* Step 6 — name / phone */}
            {step === 6 && (
              <form
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="animate-[saFadeIn_0.28s_ease]"
              >
                <div className="mb-3.5">
                  <label
                    htmlFor="sa-quiz-name"
                    className="mb-2 block text-left text-[15px] font-bold text-[#17181b]"
                  >
                    Вашето име
                  </label>
                  <input
                    id="sa-quiz-name"
                    type="text"
                    placeholder="Име"
                    autoComplete="name"
                    enterKeyHint="next"
                    className="min-h-14 w-full rounded-[14px] border border-[#d9dde4] bg-white px-4 text-[15px] font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-all duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)]"
                    {...register("name")}
                  />
                  {errors.name?.message ? (
                    <p className="mt-1.5 text-left text-[13px] font-semibold leading-[1.45] text-[#c0392b]">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="sa-quiz-phone"
                    className="mb-2 block text-left text-[15px] font-bold text-[#17181b]"
                  >
                    Телефон
                  </label>
                  <input
                    id="sa-quiz-phone"
                    type="tel"
                    placeholder="+359XXXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="done"
                    className="min-h-14 w-full rounded-[14px] border border-[#d9dde4] bg-white px-4 text-[15px] font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-all duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)]"
                    {...register("phone")}
                  />
                  {errors.phone?.message ? (
                    <p className="mt-1.5 text-left text-[13px] font-semibold leading-[1.45] text-[#c0392b]">
                      {errors.phone.message}
                    </p>
                  ) : null}
                </div>

                <MainButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Изпращаме заявката..." : "Изпрати"}
                </MainButton>

                {error && (
                  <p className="mt-2.5 text-left text-[13px] leading-[1.45] text-[#c0392b]">
                    {error}
                  </p>
                )}
              </form>
            )}

            {/* Step 7 — success */}
            {step === 7 && (
              <div className="animate-[saFadeIn_0.28s_ease] py-1 text-center">
                <div className="mx-auto mb-3.5 flex size-16 items-center justify-center rounded-full bg-brand/12 text-3xl font-black text-brand">
                  ✓
                </div>
                <h3 className="mb-2.5 text-center text-[17px] font-extrabold text-[#17181b]">
                  Благодарим!
                </h3>
                <p className="m-0 text-center text-[15px] leading-[1.65] text-[#555962]">
                  Вашата заявка е приета. Ще се свържем с вас скоро.
                </p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

