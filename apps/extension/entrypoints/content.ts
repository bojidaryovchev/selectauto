import { createShadowRootUi, defineContentScript, type ShadowRootContentScriptUi } from "#imports";
import { browser } from "wxt/browser";
import { detectCarPage } from "../lib/detect";
import { renderPanel } from "../lib/panel";
import type { DetectedCar, LotCheckRequest, LotCheckResponse } from "../lib/types";

/**
 * Content script: on a Copart / IAAI / Encar lot page, detect the lot, ask the
 * background worker whether it's on selectauto.bg, and render the status panel
 * in an isolated shadow root. Read-only — it never scrapes or writes.
 *
 * Re-runs on in-app (SPA) navigation via WXT's `wxt:locationchange` event, so
 * moving between lots on IAAI/Encar refreshes the panel without a full reload —
 * an improvement over the legacy build, which only ran once at document_idle.
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

      const res = await checkLot(car);
      if (!ctx.isValid) return; // navigated away / context invalidated mid-request

      ui = await createShadowRootUi(ctx, {
        name: "selectauto-lot-checker",
        position: "inline",
        anchor: "body",
        onMount: (container) => renderPanel(container, res, car),
      });
      ui.mount();
    };

    await run();
    ctx.addEventListener(window, "wxt:locationchange", () => {
      void run();
    });
  },
});

async function checkLot(car: DetectedCar): Promise<LotCheckResponse> {
  const req: LotCheckRequest = { type: "LOT_CHECK", source: car.source, lot: car.externalId };
  try {
    return (await browser.runtime.sendMessage(req)) as LotCheckResponse;
  } catch {
    return { ok: false, error: "no_background" };
  }
}
