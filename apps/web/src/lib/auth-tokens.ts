import { randomBytes, randomUUID } from "node:crypto";

/**
 * Server-only helpers for the self-hosted auth flows. Node `crypto` (not Web
 * Crypto) is fine here — these run in Server Actions (Node runtime), never the
 * edge proxy.
 */

/** A new opaque user id (the adapter/Auth.js use string ids; we mint uuids). */
export function newUserId(): string {
  return randomUUID();
}

/** A high-entropy URL-safe token for email-verification / password-reset links. */
export function newToken(): string {
  // 32 bytes → 64 hex chars. Unguessable; stored as-is (single-use + short TTL),
  // which is acceptable for time-boxed email links.
  return randomBytes(32).toString("hex");
}

/** Email-verification token lifetime: 24h from now. */
export function verificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/** Password-reset token lifetime: 1h from now. */
export function resetExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}
