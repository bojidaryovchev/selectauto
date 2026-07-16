/**
 * Base URL for the selectauto.bg API. In a WXT/Vite build `import.meta.env.DEV`
 * is true for `wxt dev`, so the extension talks to the local Next.js dev server
 * (`pnpm dev:web` on :3000) for end-to-end testing, and to production otherwise.
 * The dev host permission for localhost is added in wxt.config.ts (dev only).
 */
export const API_BASE = import.meta.env.DEV ? "http://localhost:3000" : "https://selectauto.bg";
