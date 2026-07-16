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
export default defineConfig({
  manifest: ({ mode }) => ({
    name: "SelectAuto Lot Checker",
    description:
      "Показва дали лотът от Copart/IAAI/Encar вече е в SelectAuto и подготвя Viber съобщение.",
    // No `storage`/`scripting`: the content script is statically declared and we
    // keep no state. Nothing to request.
    permissions: [],
    host_permissions: [
      "https://selectauto.bg/*",
      ...(mode === "development" ? ["http://localhost/*"] : []),
    ],
    icons: {
      16: "/icons/icon16.png",
      32: "/icons/icon34.png",
      48: "/icons/icon48.png",
      128: "/icons/icon128.png",
    },
  }),
});
