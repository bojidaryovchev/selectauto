import { browser } from "wxt/browser";

/**
 * Persistence for the agent's Viber phone number. Stored in
 * `browser.storage.local` so it survives navigations, tabs and browser restarts
 * — it stays whatever the agent last typed until they change it. Local (not
 * sync) is intentional: it's a per-device operator preference, not account data.
 */
const PHONE_KEY = "viberPhone";

export async function getStoredPhone(): Promise<string | null> {
  try {
    const bag = await browser.storage.local.get(PHONE_KEY);
    const phone = bag?.[PHONE_KEY];
    return typeof phone === "string" && phone.trim() ? phone : null;
  } catch {
    return null;
  }
}

export async function setStoredPhone(phone: string): Promise<void> {
  try {
    await browser.storage.local.set({ [PHONE_KEY]: phone });
  } catch {
    // storage can fail if the extension context was invalidated mid-edit — ignore.
  }
}
