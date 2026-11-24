"use client";

import Image from "next/image";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Button, IconButton, LinkButton, MakePlate } from "@/components/common";
import { INQUIRY_LOGO } from "@/constants";
import { AlertIcon, CheckIcon, ChevronLeftIcon, CloseIcon } from "@/components/icons";
import {
  INQUIRY_BRAND_LOGOS,
  INQUIRY_BRANDS,
  INQUIRY_BUDGETS,
  INQUIRY_FINANCE,
  INQUIRY_TIMES,
} from "@/data/inquiry-brands";
import { afterFirstPaint } from "@/lib/after-first-paint";
import type { InquiryContactValues } from "@/schemas/inquiry.schema";
import type { ActionResult, InquiryPrefill } from "@/types";
import { loadContactStep, loadedContactStep } from "./load-contact-step";
import { QuizOption } from "./quiz-option";
import { QuizStep } from "./quiz-step";
import { revealQuiz } from "./reveal-quiz";

/**
 * The „Безплатна консултация" quiz, one for the site: the dialog opened by every „Запитване" (InquiryModal; boards
 * `ac-inq-desk`, `ac-inq-desk2`, `ac-inq-quiz`, `ac-inq-send`, `ac-inq-tab`) and the /zapitvane page (InquiryPageQuiz;
 * boards `ac-zap`, `ac-zap-st`, `ac-zap-flow`, `ac-zap-tab`). Parity checks: docs/design/parity/inquiry.md and
 * zapitvane.md. It renders the header (step bar, car banner) and the body; the frame around them is the caller's.
 *
 * Flow: seven steps (specific model? → make → model → budget → time → finance → name/phone), then the thank-you.
 * „Не" to the first question skips make and model. A `prefill` from a car page pre-answers the first three and starts
 * at the budget, with a banner naming the car; „Назад" never goes before it.
 *
 * The variants:
 * - `dialog`: a start screen first (unless a car pre-fills it), „Затворете" in the header, and the thank-you closes
 *   it after 2,2 s. The question takes the focus at every step.
 * - `page`: the first question at once (the page's hero is the start), no close, and the thank-you stays, with
 *   „Разгледайте автомобили". Nothing is focused until the visitor answers; then each new question takes the focus,
 *   and the card comes up under the header when the step would not fit below it (on a phone, the first answer).
 */

type Screen = "start" | "quiz";
type QuizData = {
  specific_model?: string;
  brand?: string;
  model?: string;
  budget?: string;
  time?: string;
  finance?: string;
};
type ContactStepComponent = NonNullable<ReturnType<typeof loadedContactStep>>;

/** Budget is step 3 — the first step a car prefill leaves for the buyer to answer. */
const BUDGET_STEP = 3;
/** The name and phone. */
const CONTACT_STEP = 6;
/** The thank-you. */
const SENT_STEP = 7;

export function InquiryQuiz({
  variant,
  containerRef,
  prefill,
  onClose,
}: {
  variant: "dialog" | "page";
  /** The frame the quiz is drawn in (the dialog, or the page's card): the focus falls back to it, and on the page it
   *  is what scrolls back into view. */
  containerRef: RefObject<HTMLElement | null>;
  /** Car context from a car page (dialog only). */
  prefill?: InquiryPrefill;
  /** The dialog's close; shows „Затворете". */
  onClose?: () => void;
}) {
  // A car page opens the quiz knowing the make and model → pre-answer those steps.
  const isCarPrefill = Boolean(prefill?.brand && prefill?.model);
  // The earliest reachable step: a prefill can't go back past budget (make/model are fixed).
  const floorStep = isCarPrefill ? BUDGET_STEP : 0;
  const bannerLabel = prefill?.carLabel ?? [prefill?.brand, prefill?.model].filter(Boolean).join(" ");

  // Each open of the dialog mounts the quiz afresh (InquiryModal renders nothing while closed), so the first state is
  // the whole reset: the start screen, the page's first question, or the budget from a car.
  const [screen, setScreen] = useState<Screen>(variant === "dialog" && !isCarPrefill ? "start" : "quiz");
  const [step, setStep] = useState(isCarPrefill ? BUDGET_STEP : 0); // 0..7 within the quiz
  const [data, setData] = useState<QuizData>(() =>
    isCarPrefill ? { specific_model: "Да", brand: prefill!.brand, model: prefill!.model } : {},
  );
  // The name and phone as typed, kept while the contact step is closed („Назад" and forward again).
  const [typed, setTyped] = useState<InquiryContactValues>({ name: "", phone: "" });
  // The server's (or the connection's) error after „Изпратете"; field messages are the contact step's own.
  const [error, setError] = useState("");

  // The contact step's code (react-hook-form, zod): fetched when the quiz opens in the dialog, after the first paint on
  // the page, and in any case when its step is reached.
  const [Contact, setContact] = useState<ContactStepComponent | null>(() => loadedContactStep());
  const [contactFailed, setContactFailed] = useState(false);
  const [contactAttempt, setContactAttempt] = useState(0);
  const needContact = screen === "quiz" && step === CONTACT_STEP;

  useEffect(() => {
    // A failed warm-up is not an error: reaching the step retries it, and that one reports.
    const warm = () => void loadContactStep().catch(() => {});
    if (variant === "dialog") {
      warm();
      return;
    }
    return afterFirstPaint(warm);
  }, [variant]);

  useEffect(() => {
    if (!needContact || Contact) return;
    let live = true;
    loadContactStep()
      .then((Component) => {
        if (live) setContact(() => Component);
      })
      .catch(() => {
        if (live) setContactFailed(true);
      });
    return () => {
      live = false;
    };
  }, [needContact, Contact, contactAttempt]);

  // Whether the visitor has acted yet. The dialog was opened by one; on the page nothing takes the focus (or scrolls)
  // before the first answer, so a screen reader starts at the page's title.
  const interacted = useRef(variant === "dialog");

  // Each new step: its question takes the focus (the answer that was pressed is gone); a step without one, the frame.
  useEffect(() => {
    if (!interacted.current) return;
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>("[data-iq-focus]") ?? root;
    // On the page, the card comes up under the header first when the new step would end below the fold or its top
    // has scrolled away (reveal-quiz.ts).
    if (variant === "page") revealQuiz(root, target);
    else target.focus();
  }, [screen, step, variant, containerRef]);

  // The dialog closes itself 2,2 s after the thank-you (cleared if it closes sooner, so a reopened dialog stays open).
  useEffect(() => {
    if (variant !== "dialog" || step !== SENT_STEP || !onClose) return;
    const timer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timer);
  }, [variant, step, onClose]);

  function pick(key: keyof QuizData, value: string, skip = false) {
    interacted.current = true;
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
    interacted.current = true;
    setError("");
    // Car prefill: brand/model are fixed, so back never leaves the qualification steps — it floors at the budget step.
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

  // `values` is validated and normalised by the contact step (`name` trimmed, `phone` in `+359…` form); its button
  // stays busy until this resolves.
  async function submit(values: InquiryContactValues) {
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
        setStep(SENT_STEP);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Грешка при изпращане. Моля, опитайте отново.");
    }
  }

  // The back arrow shows on quiz steps beyond the floor (not on the first reachable step or the thank-you). On the
  // page the first question is the floor: there is no start screen to go back to.
  const showBack = screen === "quiz" && step > floorStep && step < SENT_STEP;

  // The ordered steps for the current path — drives „Стъпка N от M": the full quiz, the „Не" skip, or a car prefill.
  const stepFlow = isCarPrefill
    ? [3, 4, 5, 6]
    : data.specific_model === "Не"
      ? [0, 3, 4, 5, 6]
      : [0, 1, 2, 3, 4, 5, 6];
  const stepIndex = stepFlow.indexOf(step);
  // Progress is shown on the quiz screen for the answered steps (not on the start or the thank-you).
  const showProgress = screen === "quiz" && step < SENT_STEP && stepIndex >= 0;
  const showBanner = isCarPrefill && Boolean(bannerLabel);
  // The dialog always has its bar („Затворете"); the page's thank-you has none.
  const showHeader = Boolean(onClose) || showBack || showProgress || showBanner;

  return (
    <>
      {/* The header stays put while the body scrolls (the make and model lists are long on a phone). */}
      {showHeader ? (
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
            {onClose ? (
              <IconButton label="Затворете" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            ) : null}
          </div>

          {/* The car the inquiry is about (prefill only). */}
          {showBanner ? (
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
      ) : null}

      <div className="ac-iq__b">
        {/* Start screen (the dialog only) */}
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
            <Button
              variant="pri"
              size="xl"
              block
              onClick={() => {
                interacted.current = true;
                setScreen("quiz");
              }}
            >
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

        {/* Step 6 — name / phone (its own chunk; a spinner while it arrives, the retry if it can't) */}
        {needContact &&
          (Contact ? (
            <Contact
              defaults={typed}
              error={error}
              onSubmit={async (values) => {
                interacted.current = true;
                await submit(values);
              }}
              onKeep={setTyped}
            />
          ) : contactFailed ? (
            <div className="ac-iqform">
              <div className="sa-alert sa-alert--neg" role="alert">
                <AlertIcon />
                <div>Формата не успя да се зареди. Моля, опитайте отново.</div>
              </div>
              <Button
                variant="sec"
                size="xl"
                block
                onClick={() => {
                  setContactFailed(false);
                  setContactAttempt((n) => n + 1);
                }}
              >
                Опитайте отново
              </Button>
            </div>
          ) : (
            <span role="status" aria-label="Зареждане" className="grid place-items-center py-10">
              <span className="sa-spin size-8 border-3 text-or" aria-hidden="true" />
            </span>
          ))}

        {/* Step 7 — the thank-you */}
        {screen === "quiz" && step === SENT_STEP && (
          <div className="ac-iqok animate-[saFadeIn_0.28s_ease] motion-reduce:animate-none" role="status">
            <span className="ac-iqok__ic" aria-hidden="true">
              <CheckIcon />
            </span>
            <h2>Благодарим!</h2>
            <p>Вашата заявка е приета. Ще се свържем с вас скоро.</p>
            {variant === "page" ? (
              <LinkButton href="/vsichki-avtomobili" variant="sec" size="lg">
                Разгледайте автомобили
              </LinkButton>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
