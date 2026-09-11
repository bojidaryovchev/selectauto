import "server-only";

/**
 * Thin client for the mobile.bg **import API** (https://api.mobile.bg/import_api).
 *
 * The published docs page renders from `api_data.json`; the endpoint set below is
 * taken from it plus the live `/home` option list. Everything is form-encoded
 * POST or plain GET, and every response is JSON of the shape
 * `{ "status": "success …", … }` on success or `{ "status": …, "msg": … }` on
 * failure — including for HTTP 200s, so the STATUS STRING is the real result code
 * and is what `call()` branches on.
 *
 * ── Auth is a 3-minute token, and that shapes everything ─────────────────────
 * `/login` returns a 32-character token that mobile.bg documents as valid for
 * **3 minutes**, and it travels in the URL PATH of every other call
 * (`/advertpub/<token>/`), not in a header. So there is no long-lived session to
 * pool: we mint a token, use it for one operation, and let it lapse. The cache
 * below exists only so a single publish (advertpub → advertpicts, two calls) can
 * share one login; it deliberately expires at 2 minutes, a margin under their 3,
 * because a token dying mid-operation surfaces as an opaque auth error after we
 * may already have created a BILLABLE advert.
 *
 * ── Not configured is a normal state ─────────────────────────────────────────
 * The account must be manually authorised for import by mobile.bg before any of
 * this works. Until those credentials exist `isConfigured()` is false and the
 * admin UI renders the fully-computed advert preview while refusing to send —
 * the same degrade-gracefully shape as `isDocumentStorageConfigured()` in lib/s3.ts.
 */

const BASE_URL = "https://api.mobile.bg/import_api";

/** How long we reuse a token — a deliberate margin under mobile.bg's 3 minutes. */
const TOKEN_REUSE_MS = 2 * 60 * 1000;

/** mobile.bg's documented per-advert photo ceiling. */
export const MAX_PICTURES = 17;

const username = process.env.MOBILEBG_USERNAME;
const password = process.env.MOBILEBG_PASSWORD;

/** True when import credentials are present, i.e. calls can be attempted. */
export function isConfigured(): boolean {
  return Boolean(username && password);
}

/** A failed call, carrying mobile.bg's own `status`/`msg` verbatim for the log. */
export class MobilebgError extends Error {
  readonly status: string;
  readonly endpoint: string;

  constructor(endpoint: string, status: string, msg: string) {
    super(msg || status || "mobile.bg отговори с грешка.");
    this.name = "MobilebgError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

type ApiResponse = Record<string, unknown> & { status?: unknown; msg?: unknown };

/**
 * One HTTP round trip. `path` is everything after the base URL and must already
 * contain the token where the endpoint expects it.
 *
 * A non-2xx HTTP status and a `status` that does not begin with "success" are the
 * SAME failure as far as callers are concerned — mobile.bg uses both — so both
 * raise `MobilebgError`.
 */
async function call(path: string, body?: URLSearchParams): Promise<ApiResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
      body,
      // Never let Next cache an import-API call: publishing is a mutation, and
      // the token in the path would poison the cache key anyway.
      cache: "no-store",
    });
  } catch (error) {
    throw new MobilebgError(path, "network", `Няма връзка с mobile.bg: ${String(error)}`);
  }

  const text = await res.text();
  let json: ApiResponse;
  try {
    json = JSON.parse(text) as ApiResponse;
  } catch {
    throw new MobilebgError(
      path,
      String(res.status),
      `Неочакван отговор от mobile.bg: ${text.slice(0, 300)}`,
    );
  }

  const status = typeof json.status === "string" ? json.status : "";
  const msg = typeof json.msg === "string" ? json.msg : "";

  if (!res.ok || !status.startsWith("success")) {
    throw new MobilebgError(path, status || String(res.status), msg);
  }
  return json;
}

/* ------------------------------------------------------------------------- */
/* Token                                                                      */
/* ------------------------------------------------------------------------- */

let cachedToken: { token: string; mintedAt: number } | null = null;

/**
 * A usable token, minted on demand and reused only within `TOKEN_REUSE_MS`.
 *
 * Module-level state is right here despite serverless instances being
 * short-lived: the ONLY thing it buys is sharing one login between the two calls
 * of a single publish. A cold instance simply logs in again, which is the normal
 * path and costs one extra round trip.
 */
async function getToken(): Promise<string> {
  if (!isConfigured()) {
    throw new MobilebgError(
      "/login",
      "not_configured",
      "Липсват MOBILEBG_USERNAME / MOBILEBG_PASSWORD.",
    );
  }
  const now = Date.now();
  if (cachedToken && now - cachedToken.mintedAt < TOKEN_REUSE_MS) return cachedToken.token;

  const res = await call("/login", new URLSearchParams({ username: username!, password: password! }));
  const token = typeof res.token === "string" ? res.token : "";
  if (token.length === 0) {
    throw new MobilebgError("/login", "no_token", "mobile.bg не върна token.");
  }
  cachedToken = { token, mintedAt: now };
  return token;
}

/** Invalidate the cached token (after a logout, or an auth-looking failure). */
export function resetToken(): void {
  cachedToken = null;
}

/** Deactivate the current token at mobile.bg. Best-effort — never throws. */
export async function logout(): Promise<void> {
  if (!cachedToken) return;
  const token = cachedToken.token;
  resetToken();
  try {
    await call(`/logout/${token}/`, new URLSearchParams());
  } catch {
    // A token we are discarding anyway; it lapses on their side regardless.
  }
}

/* ------------------------------------------------------------------------- */
/* Adverts                                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Publish a new advert, or EDIT an existing one when `ida` is present.
 *
 * Without `ida` it creates a NEW advert — for a car already listed, a second live
 * advert that mobile.bg bills for every week it stays active (Общи условия
 * I.16). With `ida` it corrects the existing one, which is free (I.15). Callers
 * must pass the stored `mobilebg_adverts.ida` whenever they have one.
 */
export async function publishAdvert(
  params: Record<string, string>,
  ida?: string | null,
): Promise<{ ida: string | null; raw: ApiResponse }> {
  const token = await getToken();
  const body = new URLSearchParams(params);
  if (ida) body.set("ida", ida);

  const res = await call(`/advertpub/${token}/`, body);

  // The response nests the advert under `advert`, keyed as `ida` (the same name
  // the request param uses). Falling back to what we sent is correct for an edit.
  const advert = (res.advert ?? {}) as Record<string, unknown>;
  const returned = advert.ida ?? advert.id ?? res.ida;
  const resolved =
    typeof returned === "string" || typeof returned === "number" ? String(returned) : null;

  return { ida: resolved ?? ida ?? null, raw: res };
}

/**
 * Attach photos to an EXISTING advert (so this always follows `publishAdvert`).
 *
 * `picts` are FILE NAMES with the directories that follow the domain registered
 * with mobile.bg at account activation — they download them from us. `.jpg`/
 * `.jpeg` only, 1–17 per advert, `~`-separated.
 */
export async function addPictures(ida: string, picts: string[]): Promise<ApiResponse> {
  if (picts.length === 0) {
    throw new MobilebgError("/advertpicts", "no_pictures", "Няма снимки за качване.");
  }
  if (picts.length > MAX_PICTURES) {
    throw new MobilebgError(
      "/advertpicts",
      "too_many",
      `mobile.bg приема най-много ${MAX_PICTURES} снимки.`,
    );
  }
  const token = await getToken();
  return call(
    `/advertpicts/${token}/`,
    new URLSearchParams({ action: "add", ida, picts: picts.join("~") }),
  );
}

/** Delete one advert at mobile.bg. */
export async function deleteAdvert(ida: string): Promise<ApiResponse> {
  const token = await getToken();
  return call(`/advertdel/${token}/?ida=${encodeURIComponent(ida)}`);
}

/** Read one advert back as mobile.bg currently holds it (diagnostics). */
export async function loadAdvert(ida: string): Promise<ApiResponse> {
  const token = await getToken();
  return call(`/advertload/${token}/?ida=${encodeURIComponent(ida)}&pretty=1`);
}

/** Every advert id on the account, with its publish time. */
export async function listRemoteAdverts(): Promise<ApiResponse> {
  const token = await getToken();
  return call(`/adverts/${token}/?pretty=1`);
}

/**
 * VIP/TOP promotion. **Charged immediately** at mobile.bg's VIP/TOP tariff, so
 * this is only ever reachable from an explicit, separately-confirmed admin
 * action — never as a side effect of publishing.
 */
export type VipTopAction =
  | "vip1"
  | "vip2"
  | "vip3"
  | "vip4"
  | "vipautoon"
  | "vipautooff"
  | "top"
  | "topautoon"
  | "topautooff";

export async function setVipTop(ida: string, action: VipTopAction): Promise<ApiResponse> {
  const token = await getToken();
  return call(`/advertviptop/${token}/?ida=${encodeURIComponent(ida)}&action=${action}`);
}
