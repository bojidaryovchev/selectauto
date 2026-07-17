import { createShadowRootUi, defineContentScript, type ShadowRootContentScriptUi } from "#imports";
import { browser } from "wxt/browser";
import { ensureFontsInjected, logoUrl } from "../lib/assets";
import { detectCarPage } from "../lib/detect";
import { waitForIaaiStock } from "../lib/iaai-stock";
import { renderPanel } from "../lib/panel";
import { getStoredPhone, setStoredPhone } from "../lib/storage";
import type { LotCheckRequest, LotCheckResponse, Source } from "../lib/types";

const DEFAULT_PHONE = "+359 898 980 011";

/**
 * Content script: on a Copart / IAAI / Encar lot page, detect the lot, ask the
 * background worker whether it's on selectauto.bg, and render the status panel
 * in an isolated shadow root. Read-only — it never scrapes or writes.
 *
 * Re-runs on in-app (SPA) navigation via WXT's `wxt:locationchange` event, so
 * moving between lots on IAAI/Encar refreshes the panel without a full reload.
 */
export default defineContentScript({
  matches: [
    "https://*.copart.com/*",
    "https://*.iaai.com/*",
    "https://*.iaai.ca/*",
    "https://*.encar.com/*",
  ],
  runAt: "document_idle",
  cssInjectionMode: "ui",

  async main(ctx) {
    ensureFontsInjected();

    let ui: ShadowRootContentScriptUi<void> | null = null;
    let lastKey = "";

    const run = async () => {
      const car = detectCarPage();
      const key = car ? `${car.source}:${car.externalId}` : "";
      if (key === lastKey) return; // same lot (or still no lot) — nothing to do
      lastKey = key;

      if (ui) {
        ui.remove();
        ui = null;
      }
      if (!car) return;

      // Resolve the lot id to look up. IAAI's URL carries an internal item-id, not
      // the stock number our DB keys on, so read the stock from the (SPA-rendered)
      // page. Copart/Encar URL ids already match the DB.
      const isIaai = car.source === "iaai" || car.source === "iaai_ca";
      const lot = isIaai ? await waitForIaaiStock(() => ctx.isValid) : car.externalId;
      if (!ctx.isValid) return; // navigated away / context invalidated mid-request
      if (isIaai && !lot) return; // no Stock # on the page (e.g. "vehicle not found")

      const [res, savedPhone] = await Promise.all([
        checkLot(car.source, lot ?? car.externalId),
        getStoredPhone(),
      ]);
      if (!ctx.isValid) return;

      const placeholderPhone = res.phone || DEFAULT_PHONE;

      ui = await createShadowRootUi(ctx, {
        name: "selectauto-lot-checker",
        position: "inline",
        anchor: "body",
        onMount: (container) =>
          renderPanel(container, {
            res,
            car,
            logoUrl: logoUrl(),
            initialPhone: savedPhone ?? "",
            placeholderPhone,
            onPhoneChange: (phone) => void setStoredPhone(phone),
          }),
      });
      ui.mount();
    };

    await run();
    ctx.addEventListener(window, "wxt:locationchange", () => {
      void run();
    });
  },
});

async function checkLot(source: Source, lot: string): Promise<LotCheckResponse> {
  const req: LotCheckRequest = { type: "LOT_CHECK", source, lot };
  try {
    return (await browser.runtime.sendMessage(req)) as LotCheckResponse;
  } catch {
    return { ok: false, error: "no_background" };
  }
}
