type ContactStepComponent = typeof import("./contact-step").ContactStep;

/**
 * The quiz's last step, the name and phone form, is the only part that needs react-hook-form and zod. It is a chunk of
 * its own, so the /zapitvane page shows its first question without them: the quiz fetches it after the page's first
 * paint (InquiryQuiz). Cached here once it has arrived, so a later render has it at once.
 */
let loaded: ContactStepComponent | null = null;

export function loadedContactStep(): ContactStepComponent | null {
  return loaded;
}

export function loadContactStep(): Promise<ContactStepComponent> {
  return import("./contact-step").then((mod) => {
    loaded = mod.ContactStep;
    return loaded;
  });
}
