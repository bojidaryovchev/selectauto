import { initBotId } from "botid/client/core";

/**
 * BotID (Vercel Bot Management) client challenge. `instrumentation-client` runs
 * once per page load, before hydration (Next 15.3+; we're on 16), so the invisible
 * CAPTCHA is solved and its proof is ready to attach to any later `fetch` to a
 * protected path.
 *
 * `protect` lists the high-value, unauthenticated lead endpoints — all POST, all
 * `fetch`-based (BotID does NOT work with native `<form action>` submits). Each is
 * a fixed API route rather than a server action *on purpose*: the inquiry modal and
 * the calculator offer form are mounted on many/all pages, so as server actions
 * they POSTed to the current page URL and had no single path to protect. Routing
 * them through /api/inquiry and /api/calculator-offer (mirroring the existing
 * /api/carfax-request pattern) gives BotID a stable target.
 *
 * Server side, each of these routes calls `checkBotId()` and 403s bots before any
 * DB write or email. Deliberately NOT protected: /api/lot-check (called by the
 * browser extension's background script — a non-browser context that can't solve
 * the challenge) and /api/vin-check (already per-IP rate-limited).
 */
initBotId({
  protect: [
    { path: "/api/carfax-request", method: "POST" },
    { path: "/api/inquiry", method: "POST" },
    { path: "/api/calculator-offer", method: "POST" },
  ],
});
