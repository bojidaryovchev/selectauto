import { defineBackground } from "#imports";
import { browser } from "wxt/browser";
import { API_BASE } from "../lib/config";
import type { LotCheckRequest, LotCheckResponse } from "../lib/types";

/**
 * Background service worker: the ONLY component that talks to the network. The
 * content script runs in the auction page's origin, where a cross-origin fetch
 * to selectauto.bg would be blocked by CORS; routing through the worker (which
 * holds the selectauto.bg host permission) is the standard MV3 way around that.
 * It relays a single message type — LOT_CHECK — to GET /api/lot-check.
 */
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const req = message as Partial<LotCheckRequest>;
    if (req?.type !== "LOT_CHECK") return; // not ours — let other listeners handle it

    lotCheck(req as LotCheckRequest)
      .then(sendResponse)
      .catch((error: unknown) => {
        console.error("[SelectAuto] lot-check failed", error);
        sendResponse({ ok: false, error: "fetch_failed" } satisfies LotCheckResponse);
      });

    return true; // keep the message channel open for the async sendResponse
  });
});

async function lotCheck(req: LotCheckRequest): Promise<LotCheckResponse> {
  const params = new URLSearchParams({ source: req.source, lot: req.lot });
  if (req.vin) params.set("vin", req.vin);

  const res = await fetch(`${API_BASE}/api/lot-check?${params.toString()}`, {
    headers: { accept: "application/json" },
  });

  if (!res.ok) return { ok: false, error: `http_${res.status}` };
  return (await res.json()) as LotCheckResponse;
}
