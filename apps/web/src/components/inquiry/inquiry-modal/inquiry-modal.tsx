"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/common";
import {
  INQUIRY_BRANDS,
  INQUIRY_BUDGETS,
  INQUIRY_FINANCE,
  INQUIRY_TIMES,
} from "@/data/inquiry-brands";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { createInquiry } from "@/mutations/inquiries";
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

export function InquiryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("start");
  const [step, setStep] = useState(0); // 0..7 within the quiz
  const [data, setData] = useState<QuizData>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const reset = useCallback(() => {
    setScreen("start");
    setStep(0);
    setData({});
    setName("");
    setPhone("");
    setError("");
    setSending(false);
  }, []);

  const close = useCallback(() => {
    onClose();
    // Defer reset so the close transition doesn't show a flash of step 0.
    reset();
  }, [onClose, reset]);

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

  async function submit() {
    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);

    if (!cleanName || !isValidPhone(cleanPhone)) {
      setError("Моля въведете име и валиден телефонен номер.");
      return;
    }

    setError("");
    setSending(true);

    try {
      const result = await createInquiry({
        name: cleanName,
        phone: cleanPhone,
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
    } finally {
      setSending(false);
    }
  }

  // The back arrow shows on quiz steps 1..6 (not on the first question or the
  // success step), matching theme.js `showStep`.
  const showBack = screen === "quiz" && step > 0 && step < 7;

  return (
    <div
      className="fixed inset-0 z-[99999]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sa-inquiry-title"
    >
      {/* Backdrop */}
      <div
        onClick={close}
        className="absolute inset-0 bg-[rgba(8,10,14,0.72)] backdrop-blur-lg"
      />

      {/* Dialog */}
      <div className="relative z-[2] mx-auto mt-[5vh] max-h-[min(88vh,820px)] w-[min(100%-24px,520px)] overflow-y-auto rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,250,0.98)_100%)] px-7 pb-[26px] pt-7 shadow-[0_30px_80px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md max-[640px]:mt-[3vh] max-[640px]:max-h-[92vh] max-[640px]:w-[min(100%-16px,460px)] max-[640px]:rounded-[22px] max-[640px]:px-[18px] max-[640px]:pb-[18px] max-[640px]:pt-[22px]">
        <Button
          aria-label="Затвори"
          onClick={close}
          className="absolute right-3.5 top-3 inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f1f2f4] text-2xl leading-none text-[#6f747c] transition-all duration-200 hover:-translate-y-px hover:bg-[#e8eaee] hover:text-[#17181b]"
        >
          ×
        </Button>

        {/* Start screen */}
        {screen === "start" && (
          <div>
            <Image
              src={LOGO}
              alt="SelectAuto"
              width={150}
              height={62}
              unoptimized
              className="mx-auto mb-3.5 block max-w-[150px] rounded-[10px] max-[640px]:max-w-[130px]"
            />
            <h2
              id="sa-inquiry-title"
              className="mb-3 text-center text-[28px] font-extrabold text-[#17181b] max-[640px]:text-2xl"
            >
              Безплатна консултация
            </h2>
            <p className="mx-auto mb-[18px] text-center text-[15px] leading-[1.65] text-[#555962]">
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
            <div className="mb-2.5 flex items-center justify-between">
              {showBack ? (
                <Button
                  onClick={back}
                  aria-label="Назад"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f1f2f4] text-2xl leading-none text-[#6f747c] transition-all duration-200 hover:-translate-y-px hover:bg-[#e8eaee] hover:text-[#17181b]"
                >
                  ←
                </Button>
              ) : (
                <span />
              )}
            </div>

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
              <div className="animate-[saFadeIn_0.28s_ease]">
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Име"
                    autoComplete="name"
                    enterKeyHint="next"
                    className="mb-4 min-h-[56px] w-full rounded-[14px] border border-[#d9dde4] bg-white px-4 text-[15px] font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-all duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)]"
                  />
                </div>
                <div className="mb-3.5">
                  <label
                    htmlFor="sa-quiz-phone"
                    className="mb-2 block text-left text-[15px] font-bold text-[#17181b]"
                  >
                    Телефон
                  </label>
                  <input
                    id="sa-quiz-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+359XXXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="done"
                    className="mb-4 min-h-[56px] w-full rounded-[14px] border border-[#d9dde4] bg-white px-4 text-[15px] font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-all duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)]"
                  />
                </div>

                <MainButton onClick={submit} disabled={sending}>
                  {sending ? (
                    <>
                      <span className="mr-1">🚗</span> Изпращаме заявката...
                    </>
                  ) : (
                    "Изпрати"
                  )}
                </MainButton>

                {error && (
                  <p className="mt-2.5 text-left text-[13px] leading-[1.45] text-[#c0392b]">
                    {error}
                  </p>
                )}
              </div>
            )}

            {/* Step 7 — success */}
            {step === 7 && (
              <div className="animate-[saFadeIn_0.28s_ease] py-1 text-center">
                <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-brand/[0.12] text-3xl font-black text-brand">
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
  );
}

