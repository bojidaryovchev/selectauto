/**
 * Base URL for the selectauto.bg API. In a WXT/Vite build `import.meta.env.DEV`
 * is true for `wxt dev`, so the extension talks to the local Next.js dev server
 * (`pnpm dev:web` on :3000) for end-to-end testing, and to production otherwise.
 * The dev host permission for localhost is added in wxt.config.ts (dev only).
 */
// NB: the CANONICAL host is www.selectauto.bg — the apex selectauto.bg issues a
// 308 redirect to it. A background fetch can't follow a redirect to a host it
// lacks permission for, so we must target www directly (and grant it in
// wxt.config.ts host_permissions), otherwise the lookup fails with "no connection".
export const API_BASE = import.meta.env.DEV ? "http://localhost:3000" : "https://www.selectauto.bg";
