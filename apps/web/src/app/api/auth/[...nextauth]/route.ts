import { handlers } from "@/auth";

// Auth.js route handler — exposes the NextAuth endpoints (callback, signin,
// signout, session, csrf, providers) under /api/auth/*. `handlers` is the
// { GET, POST } pair from the full server-side auth instance.
//
// This runs on the Node runtime by default in Next 16 (the edge runtime is
// opt-in), which is what we need — the Credentials provider uses bcrypt and the
// Drizzle adapter uses a TCP DB connection. We do NOT set
// `export const runtime` because cacheComponents rejects route segment runtime
// config; the Node default already applies.
export const { GET, POST } = handlers;
