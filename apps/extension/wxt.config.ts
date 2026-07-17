import { defineConfig } from "wxt";

/**
 * WXT config for the SelectAuto Lot Checker extension.
 *
 * Security posture (a deliberate improvement over the legacy v1 extension): the
 * old build scraped the auction sites' own APIs cross-origin and shipped write
 * endpoints, so it requested broad host access to copart/iaai/encar. This
 * rewrite is READ-ONLY — the only network call is to selectauto.bg — so the sole
 * host permission is selectauto.bg (plus localhost in dev for testing against
 * `pnpm dev:web`). The content script still MATCHES the auction hosts (to detect
 * the lot + render the badge) but never fetches from them.
 */

/** Auction hosts the content script + its web-accessible assets run on. */
const AUCTION_MATCHES = [
  "https://*.copart.com/*",
  "https://*.iaai.com/*",
  "https://*.iaai.ca/*",
  "https://*.encar.com/*",
];

export default defineConfig({
  manifest: ({ mode }) => ({
    name: "SelectAuto Lot Checker",
    description:
      "Показва дали лотът от Copart/IAAI/Encar вече е в SelectAuto и подготвя Viber съобщение.",
    // `storage`: persists the user's Viber phone number (browser.storage.local).
    // No `scripting`: the content script is statically declared.
    permissions: ["storage"],
    host_permissions: [
      // www is the canonical host the API is served from (apex 308-redirects to
      // it); the fetch targets www directly. Apex is kept so a redirect can still
      // be followed if the canonical host ever changes.
      "https://www.selectauto.bg/*",
      "https://selectauto.bg/*",
      ...(mode === "development" ? ["http://localhost/*"] : []),
    ],
    // The toolbar/extension icon is the SelectAuto app icon (single source; Chrome
    // downscales per slot). No image toolchain is available in the repo to pre-size
    // it, and one 165 KB PNG is fine for an internal tool.
    icons: {
      16: "/logo.png",
      32: "/logo.png",
      48: "/logo.png",
      128: "/logo.png",
    },
    // The panel's logo + fonts are extension files rendered INTO the auction
    // page's DOM, so they must be web-accessible on those hosts (WXT does not add
    // these automatically — see wxt.dev/guide/essentials/assets). Loaded at
    // runtime via browser.runtime.getURL().
    web_accessible_resources: [
      {
        matches: AUCTION_MATCHES,
        resources: [
          "logo.png",
          "fonts/montserrat-latin.woff2",
          "fonts/montserrat-cyrillic.woff2",
        ],
      },
    ],
  }),
});
