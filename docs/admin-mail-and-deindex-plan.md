# Admin Mail & Paid Deindex — Implementation Plan

Two admin-panel features, planned together because they share prerequisites
(migration discipline, the audit-trail gap) but are otherwise independent and can
ship in either order.

- **Feature A — Reply to inbound mail as `info@selectauto.bg`** from the back office.
- **Feature B — One-click paid deindex** of a specific car (owners pay to be delisted).

Companion to [`11-web-seo-and-indexing.md`](11-web-seo-and-indexing.md) (the
as-built indexing posture, which Feature B extends) and
[`contracts-payments-plan.md`](contracts-payments-plan.md) (the plan-doc precedent).

**Decisions taken** (2026-08-07):

| # | Decision | Chosen |
|---|---|---|
| 1 | Deindexed car, direct visitor | **410 Gone** — page vanishes |
| 2 | Deindex identity key | **Normalized VIN**, applied to every matching `cars.id`, forward-applying |
| 3 | Feature A sequencing | **Forward first**, then build the inbox |
| 4 | Business blockers | Documented as prerequisites (§4), not designed here |

---

## 0. Ground truth established by research

These were verified live, not assumed. They overturn several plausible assumptions.

### 0.1 Mail: inbound is ALREADY live on Resend, and there is no mailbox

Live DNS for `selectauto.bg` (2026-08-07, two independent resolvers):

```
selectauto.bg          MX   10 inbound-smtp.eu-west-1.amazonaws.com   (ONLY MX)
selectauto.bg          TXT  google-site-verification=xEBiuWFUV21…     (no SPF)
_dmarc.selectauto.bg   TXT  — DOES NOT EXIST —
resend._domainkey…     TXT  p=MIGfMA0GCSqGSIb3DQEB…                   (1024-bit RSA)
send.selectauto.bg     MX   10 feedback-smtp.eu-west-1.amazonses.com
send.selectauto.bg     TXT  v=spf1 include:amazonses.com ~all
NS                          ns1/ns2.vercel-dns.com                     (DNS on Vercel)
```

A live SMTP `RCPT` probe against the MX (EHLO/MAIL FROM/RCPT TO/QUIT — no DATA
phase, nothing delivered) returned:

```
220 inbound-smtp.eu-west-1.amazonaws.com ESMTP Amazon SES
RCPT TO:<info@selectauto.bg>                    → 250 Ok
RCPT TO:<definitely-not-real-9z8x@selectauto.bg> → 250 Ok
RCPT TO:<info@example.invalid>   (CONTROL)      → 550 mailbox unavailable
```

The control proves the `250`s are real configuration, not blanket acceptance.
**Receiving is on, and it is catch-all.**

Consequences:

- **Sending as `info@selectauto.bg` works today with zero configuration.** Resend
  verifies *domains*, not addresses ("Send and receive emails using any email
  address at your domain without any extra configuration"). The `send.` return-path
  + `resend._domainkey` records are Resend's verification set, character-for-character.
- **There is no mailbox.** SES/Resend receiving offers no IMAP or POP. No human can
  open this mail in a normal client — only the Resend dashboard.
- **No webhook exists in this repo** consuming `email.received` (grep for
  `email.received` / `webhooks.verify` / `receiving` in application code: zero hits).
- [`lib/email.ts:168`](../apps/web/src/lib/email.ts#L168) sets `replyTo: info@selectauto.bg`
  on every customer calculator quote. **Customer replies have likely been
  accumulating unread.** Check the Resend Receiving tab before treating Feature A
  as new capability rather than incident recovery.
- [`lib/email.ts:31-32`](../apps/web/src/lib/email.ts#L31-L32) sends every internal
  lead notification *to* `info@selectauto.bg` — each is now billed twice (one send,
  one receive) and lands back in the inbound stream as robot noise.

> **Residual uncertainty:** the probe proves a receipt rule exists for the domain in
> eu-west-1; it does not prove *which account* owns it. Resend is the overwhelming
> explanation (their docs prescribe this exact MX shape; the domain is already a
> verified Resend sending domain in the same region; our own AWS is eu-central-1 with
> zero SES resources in `infra/`). **Confirm in the Resend dashboard before building.**

### 0.2 Deindex: the hard mechanism already exists

[`proxy.ts:33-43`](../apps/web/src/proxy.ts#L33-L43) already emits a real 410:

```ts
function gone(): NextResponse {
  return new NextResponse(null, { status: 410, headers: { "x-robots-tag": "noindex" } });
}
const id = parseAvtomobilId(request.nextUrl.pathname);
if (id !== null && (await isLongDeadArchivedLot(id))) return gone();
```

This is the **only** place in the app that can emit a 410 — the detail page is PPR
and streams a 200 shell ([`page.tsx:123-127`](../apps/web/src/app/avtomobil/[id]/page.tsx#L123-L127)
documents this). It runs per-request on the Node runtime, answering from a **30s in-memory snapshot
of the de-indexed id set** (one query per instance per TTL — the per-request lookup
was ~700k Neon round trips/day at crawler volume; see docs/11 §3), so a flag flip
takes effect within ~30s. That is still fast enough for a paying customer to verify
on the spot.

Live production checks confirmed the surrounding facts:

- Car pages emit **no** robots meta today (indexable), are `x-nextjs-prerender: 1`,
  and were served from Vercel's edge cache with `age: 722141` (**8.4 days**).
- Sitemap chunk 0 holds **50,000** URLs across 20 chunks, `x-vercel-cache: HIT`, age ~2.7h.
- A nonexistent id (`/avtomobil/99999999`) already returns `200` + `<meta name="robots" content="noindex, follow">`.

---

## 1. Shared prerequisites

### 1.1 Migration discipline

Migrations are hand-written SQL, hand-applied via `migrate.mjs`, **never
auto-applied on deploy**; the web app deploys via Vercel's Git integration with no
CI in the repo. `0042_ingestion_write_amplification.sql` is currently **untracked
and possibly unapplied**.

**Required order for both features:**

1. ~~Confirm the true next number against the applied `_migrations` table.~~
   **Verified 2026-08-07:** `pnpm run migrate:status` reports "Up to date" through
   `0042_ingestion_write_amplification.sql`. **The next migration number is `0043`.**
2. Apply the additive-only migration.
3. *Then* deploy the code that reads the new columns.

Deploying reading code first produces a production 500.

### 1.2 The audit trail is write-only

`contract_events` is rendered in exactly one place — the contract detail page
(`admin/dogovori/[id]/page.tsx`). Role-change events are written with `entityId: 0`
where nothing displays them. **If both features write audit rows into this table,
nobody will ever read them.** For a paid service that is a compliance problem, not
a nicety: build a per-entity events panel (or a global `/admin/log`) in the same
change, and extend the `EVENT_LABELS` map.

### 1.3 Admin conventions (corrected — some repo docs are stale)

- **Route:** `apps/web/src/app/admin/<bg-slug>/page.tsx`, default export,
  `await requireAdminPage()` as the **first line**. The layout's `AdminGate` only
  calls `requireBackOfficePage()` — an `observer` passes it. Never rely on the layout.
  (The layout's own docstring says `requireAdminPage`; the code says otherwise.)
- **Nav:** one entry in the `isAdmin` branch of `components/admin/admin-nav.tsx`.
  Active state is `pathname.startsWith(l.href)` — the new slug must not be a prefix
  of another.
- **UI:** no shadcn, no Radix. Raw `<table>` in
  `overflow-x-auto rounded-xl border border-line bg-white`; inline BG error banner
  (`bg-[#fdecea] text-[#b3261e]`), not toast; `ConfirmDialog` with `tone="danger"`
  for the irreversible/paid click; icons only from `components/icons/` (one per file,
  complete `<svg viewBox="0 0 24 24">` accepting `className` — the admin panel
  currently has zero inline `<svg>`).
- **Reads:** `queries/<entity>/*.query.ts`, `if (!(await getAdminSession())) throw new Error("FORBIDDEN")`,
  not `"use cache"`, `ADMIN_PAGE_SIZE = 50`.
- **Writes:** `mutations/<entity>/*.mutation.ts` (`.action.ts` is reserved for
  non-write server actions), `"use server"` first line, `getAdminSession()` first
  **statement**, zod from `schemas/`, `ActionResult<T>` return, never throw for
  expected failures.
- **Server actions are untrusted entry points.** The installed Next 16.2.10 docs are
  explicit: an action "is reachable to anyone who can send the same POST" and
  "render-time gating … is not a security boundary". The in-repo comment at
  `update-lead.mutation.ts:35-36` ("the proxy + page already block non-admins") is
  not a valid security argument — do not propagate it. All 24 existing write actions
  do self-gate; keep it that way.

---

## 2. Feature A — reply as `info@selectauto.bg`

### 2.0 Prerequisites (do these first, they are DNS/ops, not code)

1. **Publish `_dmarc.selectauto.bg` TXT** — `v=DMARC1; p=none; rua=mailto:<addr>` in
   Vercel DNS. Then tighten to `quarantine`/`reject` once reports look clean.
   Replies from `info@` to real consumers are precisely the mail Gmail and Outlook
   scrutinise most, and today there is no policy at all.
2. **Consider an apex SPF record.** Not required for Resend (SPF is evaluated against
   the `send.selectauto.bg` return-path, which passes and relaxed-aligns), but with
   no DMARC and no apex SPF, `info@selectauto.bg` is trivially spoofable.
3. **Consider rotating DKIM to 2048-bit.** The published key is 1024-bit
   (`MIGfMA0GCSqGSIb3DQEB…` is the 1024-bit SPKI prefix) — acceptable but at the
   floor of current bulk-sender guidance, and you are already touching mail DNS.
4. **Check the Resend Receiving tab** for unread customer mail (see §0.1).
5. **Document the mail setup in `docs/`.** The entire configuration — MX, DKIM,
   receiving — lives in the Vercel and Resend dashboards, is outside version control
   and outside Pulumi, and has **no repo artifact**. A future DNS migration would
   silently kill all business email. The 60-second TTL means both breakage and
   rollback propagate within a minute.

### 2.1 Phase 0 — restore human visibility (hours, not weeks)

A minimal webhook that forwards everything to a real mailbox. `resend.emails.receiving.forward()`
"automatically handles fetching the email content and attachments" — no schema, no UI.

```
POST /api/resend-inbound
  → raw body via await request.text()
  → resend.webhooks.verify(...)  (throws → 400)
  → filter on data.received_for  (drop non-info@ before any further call)
  → resend.emails.receiving.forward({ emailId, to: <real mailbox>, from: … })
```

Note the forward is itself an outbound send and consumes quota.

### 2.2 Phase 1 — schema

Migration `00XX_admin_mail.sql` (additive):

- **`email_threads`** — `id`, `subject`, `participant_email`, `participant_name`,
  `status` (нов / в процес / затворен), `assigned_to` → `users.id`, `last_message_at`,
  `last_direction`, `unread`, `references_chain text[]`, `created_at`, `updated_at`.
  Optionally soft-link to a lead by email match.
- **`email_messages`** — `id`, `thread_id`, `direction` ('inbound'|'outbound'),
  **`resend_email_id` UNIQUE** (webhook delivery is at-least-once — this is the
  dedupe key), `message_id` (RFC form, angle brackets retained — the threading key),
  `in_reply_to`, `references text[]`, `from_address`, `to_addresses text[]`, `cc`,
  `bcc`, `received_for`, `subject`, `text_body`, `html_body`, `headers jsonb`,
  `sent_by_user_id`, `resend_send_id`, `delivery_state`, `has_attachments`, `created_at`.
- **`email_attachments`** — `id`, `message_id`, `resend_attachment_id`, `filename`,
  `content_type`, `content_disposition`, `content_id`, `size`, `s3_key`, `created_at`.

**Why the References chain is a schema requirement, not an afterthought:** Resend
maintains no conversation state. Correct multi-turn threading in Gmail/Outlook needs
`In-Reply-To` + an accumulating space-separated `References` header, so the chain
must be persisted per thread.

### 2.3 Phase 1 — webhook

`apps/web/src/app/api/resend-inbound/route.ts`:

- **`await request.text()`, never `request.json()`.** The HMAC is over the raw body;
  any re-serialization breaks verification.
- `resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret })`
  reading `svix-id` / `svix-timestamp` / `svix-signature` via `request.headers.get(...)`.
  It is **synchronous and throws** — wrap in try/catch, return 400.
- New env var **`RESEND_WEBHOOK_SECRET`** (`.env.example` currently has only
  `RESEND_API_KEY` and `CARFAX_NOTIFY_EMAIL`).
- **The signature IS the gate.** The proxy matcher includes `/(api|trpc)(.*)` for
  session refresh, but only `/admin` is force-gated — API routes authenticate themselves.
- **Filter on `received_for` early.** The domain is a wide-open catch-all; drop
  non-`info@` traffic before any follow-up API call.
- Persist metadata, return 200 fast.
- **Do NOT install `svix`.** Resend 6.17.2 bundles `standardwebhooks` and maps the
  `svix-*` headers internally. Verified in `node_modules`.

### 2.4 Phase 1 — body fetch

The webhook payload is **metadata only** — "Webhooks do not include the email body,
headers, or attachments, only their metadata." A second call is mandatory:
`resend.emails.receiving.get(email_id, { html_format: 'cid' })`.

**Fetch lazily on first admin open, plus a reconcile cron** — not inline in the
webhook. Resend's rate limit is **10 req/s per team**, shared with password-reset,
verification and calculator sends. A burst of inbound must not starve user-facing mail.

Use `html_format: 'cid'` deliberately: the default `data_uri` inlines every image as
base64 and will bloat rows.

Emails are not lost if the endpoint is down — Resend stores them server-side, and
`resend.emails.receiving.list()` can backfill. That is what the reconcile cron is for.

Attachment `download_url`s **expire in 1 hour** — never persist them. Either re-fetch
on demand, or copy bytes into the existing private bucket (`lib/s3.ts` `putDocument`,
served through the `api/payment-attachment/[id]` auth pattern).

### 2.5 Phase 1 — admin UI

`apps/web/src/app/admin/poshta/page.tsx` (slug does not prefix-collide with
`carfax`, `depoziti`, `dogovori`, `oferti`, `poluchateli`, `potrebiteli`, `tarifi`,
`zapitvaniya`). `await requireAdminPage()` first line. No own `<Suspense>` needed —
the layout supplies one.

Thread list + detail drawer, modelled on `components/admin/lead-inbox/`.

> **Security requirement — do not skip.** Rendering untrusted inbound HTML into
> `/admin` is a stored-XSS path into the highest-privilege surface in the app (it can
> mint contracts, change roles, generate payment documents, and — after Feature B —
> delist cars). [`next.config.ts`](../apps/web/next.config.ts) explicitly declines to
> set a Content-Security-Policy, and there is no sanitizer in the dependency tree.
> **Render `text/plain` by default.** If HTML is ever shown, it must be a sandboxed
> iframe with an explicit per-route CSP — never inline.

**Multi-admin concurrency has no data model today.** Roles are just `admin`/`observer`
with no assignment concept. Minimum additions so two admins don't both reply:
read/unread, `claimed_by` + `claimed_at` (soft lock with timeout), and
who-replied-when surfaced in the **list**, not just the drawer.

### 2.6 Phase 1 — reply mutation

`mutations/email/send-reply.mutation.ts`:

```ts
from:    "SelectAuto <info@selectauto.bg>"   // new constant — keep noreply reputation separate
to:      inbound.reply_to ?? inbound.from
subject: `Re: ${originalSubject}`            // the Re: prefix is part of the threading contract
headers: {
  "In-Reply-To": inbound.message_id,
  "References":  [...thread.references_chain, inbound.message_id].join(" "),
}
idempotencyKey: `reply-${replyRowId}`        // expires after 24h, max 256 chars
```

Gmail's own API docs independently confirm the same contract (matching subject +
`References`/`In-Reply-To` per RFC 2822), so this is not Resend-specific.

**Break from the house style here.** Every existing send is deliberately best-effort
(try/catch, `console.error`, never fail the operation) — correct for notifications,
**wrong for a human reply**, where silent failure means a lost customer. Persist the
Resend id on send, surface delivery state next to the message, and treat send failure
as a first-class UI error. Note there is no error tracking installed anywhere in
`apps/web`, so a `console.error` goes nowhere.

Close with `revalidatePath("/admin", "layout")`.

### 2.7 Operational risk to accept explicitly

Inbound counts against the **same quota** as outbound ("Each received email counts as
1 email against your daily and monthly limits"), the domain is an uncontrollable
catch-all, and overage is hard-capped at 5× the monthly quota after which **sending is
paused until the next billing cycle**. An inbound spam flood can therefore stop
registration and password-reset email site-wide, and with no error tracking the first
symptom is users unable to sign up. Add a quota alert.

---

## 3. Feature B — paid one-click deindex

### 3.1 Where the flag lives, and what it is keyed on

**On `cars`, not on the projections.** Ingestion's `ON CONFLICT` clauses are
hand-written column whitelists ([`shared/db.ts:281-296`](../packages/functions/shared/db.ts#L281-L296)
for cars, `:359-386` for lots, `:474-484` for archive), so a new column is never
touched on insert or update, and nothing in `packages/functions` deletes `cars` rows.

Do **not** put it on `car_listings` / `car_listings_archived`. Their recompute
`ON CONFLICT` is also a whitelist (so an UPSERT is safe), but the rows are `DELETE`d
whenever a car stops qualifying — an active→archived→active round trip, or a lot
losing its `image_url`, silently destroys the flag.

Do **not** reuse `auction_lots.archived` — it is written back from the upstream
payload on every sync, so an upstream `archived: false` would un-hide the car.

**Key on normalized VIN** (decision 2). `cars.vin` is a plain **non-unique, nullable**
index ([`schema.ts:66`](../packages/db/schema.ts#L66)) and ingestion only trims the
VIN, never upper-cases it — while the repo's own `/api/lot-check` resolves a VIN with
`orderBy(desc(cars.id)).limit(1)`, i.e. it already assumes duplicates. One physical
car produces several `cars.id` rows (a relist, or Copart→IAAI), each with its own
`/avtomobil/{id}` URL. A `car_id`-keyed deindex leaves the siblings live — the exact
failure a paying customer finds by googling their own VIN.

Proposed shape:

- **`car_deindex_requests`** — `id`, `vin_normalized` (trimmed, upper-cased, 17 chars,
  **UNIQUE**), `requested_by` (free text / contact), `proof_ref`, `status`,
  `fee_amount`, `paid_at`, `created_by` → `users.id`, `created_at`, `revoked_at`,
  `revoked_by`, `notes`.
- **`cars.deindexed_at timestamptz`** — denormalized onto every matching `cars.id` so
  the hot proxy path stays a single-column point lookup.
- **Forward-applying:** ingestion (or a small post-sync step) must stamp
  `deindexed_at` on any newly-arrived car whose normalized VIN matches an active
  request. Without this, the same vehicle reappearing under a new `external_car_id`
  gets a fresh, indexable URL.

> **Deleting a `cars` row is not an alternative.** `auction_lots.carId` is
> `onDelete: "set null"` ([`schema.ts:80`](../packages/db/schema.ts#L80)), not cascade.
> Deleting the car leaves the lots alive with `car_id = NULL`, and the next sync
> re-links them — the archived path resolves `car_id` by `LEFT JOIN cars ON external_car_id`,
> the active path re-inserts under a **new serial id**. The car returns at a
> *different* URL and the paid flag is keyed to a dead id.

### 3.2 The instant hard signal — proxy 410

Extend [`lib/sold-lot-gone.ts`](../apps/web/src/lib/sold-lot-gone.ts). **Merge into the
existing query** — it already runs one point lookup on every car-page request; do not
add a second.

```sql
SELECT 1 FROM cars c
LEFT JOIN car_listings_archived a ON a.car_id = c.id
WHERE c.id = $1
  AND ( c.deindexed_at IS NOT NULL
     OR (a.archived_at IS NOT NULL AND a.archived_at < now() - $2::interval) )
LIMIT 1
```

Two hardening items:

- **Failure policy.** `isLongDeadArchivedLot` fails **closed to `false`** (never 410)
  on any DB error — correct for the sold-lot timer (a DB hiccup must not take down
  live car pages) but backwards for a paid guarantee. Recommend keeping fail-safe
  (availability wins) but adding an alert, and stating the behaviour in the customer
  T&Cs rather than silently inverting it.
- **URL shapes.** `parseAvtomobilId` matches `/^\/avtomobil\/(\d+)\/?$/` against
  `request.nextUrl.pathname`. Query strings are **fine** (pathname excludes them), but
  `//avtomobil/123` and `/avtomobil/00123` are not matched. Google explicitly warns to
  "protect or remove all variations of the URL". Loosen the regex.

### 3.3 Page-level `noindex` (belt-and-braces)

[`page.tsx:95`](../apps/web/src/app/avtomobil/[id]/page.tsx#L95) already has the hook:

```ts
robots: detail.isPast ? { index: false, follow: true } : undefined,
```

OR in the deindex flag, and add `noimageindex` in the `googleBot` block (the nested
`robots.googleBot` shape is confirmed available in the installed Next version). Adding
the read to the **existing** `getCarDetail` call in `generateMetadata` is free; a
second uncached read is not.

### 3.4 Every read path that must exclude a deindexed car

This is the bulk of the work and is easy to under-scope. Verified checklist:

**Shared predicate builder** — [`lib/car-listing-conditions.ts:41`](../apps/web/src/lib/car-listing-conditions.ts#L41)
`buildListingConditions` has **zero** visibility predicates today. It is shared by the
feed, the count and the facets.

**Paths that BYPASS it and need separate patching:**

- **`searchPage`** (`get-cars-page.query.ts`) — matches lot-number prefix **or exact
  VIN**, bypassing the shared builder entirely. This is the single query a car owner
  is most likely to run. Missing it defeats the whole product.
- `keysetPage` (SSR first page + both infinite-scroll directions), `getCarsWindow`
  (deep-link `?after=` window and its own COUNT).
- `get-car-detail.query.ts` — active-then-archived resolution, **and** `getRelatedCars`
  (the carousel on *other* cars' pages).
- `get-buy-now-cars` / `get-auction-cars` (homepage).
- `get-favorite-cars.query.ts` (`/lyubimi`) and **`get-due-favorite-auction-alerts.query.ts`
  — the daily digest would email a link to a deindexed car.**
- `get-model-hub-stats`, `get-model-sold-prices`, `get-car-facets` (live GROUP BY).
- The two directly-POST-able server actions `load-more-cars.action.ts` / `load-prev-cars.action.ts`.
- The three country landing pages (`vnos-na-koli-ot-sasht` / `-kanada` / `-korea`) all call `getCarsPage`.
- `/vsichki-avtomobili` ItemList JSON-LD; brand/model hub pages and their JSON-LD.

**Summary tables — NOT covered by touching the projection:**
`car_listing_counts` and `car_listing_facets` back the catalog's "Намерени: N", the
filter dropdowns, **and both hub sitemaps**. See §3.5.

**Sitemap:** `get-listing-sitemap.query.ts` — filter **both** the chunk query and
`getSitemapChunkCursors`, or neither. Filtering one and not the other drifts the chunk
boundaries. `app/avtomobil/sitemap.ts` maps rows unconditionally; `robots.ts` derives
the chunk count from the same cursors.

**`/api/lot-check`** — public, unauthenticated, IP-rate-limited only, and **consumed by
the shipped browser extension**. It builds `${SITE_URL}/avtomobil/${carId}` *before* the
projection lookup and returns it as `{status:"unlisted", url}`. Needs its own explicit check.

**`/api/vin-check` + `/proverka-vin`** — public VIN tool backed by AuctionsAPI through
the `vin_report_checks` cache. It will still report that auction records exist. **This
cannot be fixed by any DB projection change** — decide whether the flag gates the
endpoint (which means the site lies about upstream data) or the promise is scoped to
"our listing page" and stated as such.

**Do NOT add the URL to `robots.txt`.** A `Disallow` stops Google from ever crawling
the page, so it never sees the 410 or the `noindex` — actively sabotaging removal.
[`robots.ts:17-21`](../apps/web/src/app/robots.ts#L17-L21) already documents this trap.

**Verified harmless (stop worrying about these):** the model sold-price aggregates leak
nothing per-car (`round(avg())` + `count()` with a 3-sale minimum); the static
`FALLBACK_*` home data hard-codes `href: "/vsichki-avtomobili"` on all 12 entries; there
are no `opengraph-image` route files, so there is no dynamic OG cache to purge; and
`/avtomobil/[id]` has no `generateStaticParams`, so there is no prerendered 945k set.

### 3.5 The mutation must recompute, and must go through `_counted`

Two traps that will silently break this:

**(a) A recompute-level predicate is inert until something recomputes that car.**
Ingestion only recomputes `touchedCarIds`, populated from the upserts' `RETURNING`
rows — and those upserts fire only when `raw_json IS DISTINCT FROM EXCLUDED.raw_json`.
A deindexed car whose upstream payload is unchanged is **never touched**, so the
predicate does nothing until the **weekly** `driftSweep` (`cron(0 3 ? * SUN *)`).
`shared/db.ts:186-191` documents this exact hazard: *"adding or changing a DERIVED
column no longer back-fills itself on the next sync. Any such change now REQUIRES an
explicit backfill."*

→ **The admin mutation must itself run `recompute_car_listings_counted(ARRAY[ids])`
and `recompute_archived_car_listings_counted(ARRAY[ids])` in the same transaction.**

**(b) Never hand-write `DELETE FROM car_listings`.** The summary tables are maintained
by a before/after snapshot diff taken *inside* the `_counted` wrappers under an
advisory lock (`listing_count_snapshot` → recompute → `apply_listing_count_delta`).
An out-of-band delete never produces a delta, so `car_listing_counts` and
`car_listing_facets` drift **permanently** — `reseed-summaries.mjs` is documented as
"only for a one-time repair after a DELIBERATE recompute_* logic change … never on a timer."

### 3.6 Cache invalidation — `updateTag`, not `revalidateTag(tag, "max")`

This is the correction most likely to produce a broken implementation.

Per the installed Next 16.2.10 docs, `revalidateTag(tag, "max")` is
**stale-while-revalidate**: *"the stale content is served while fresh content is
fetched in the background"* — i.e. the next visitor is served the still-visible
deindexed car. `updateTag(tag)` *"immediately expires the cached data … The next
request will wait to fetch fresh data"*, and it can **only** be called from a Server
Action (not a Route Handler, not the proxy).

- Use `updateTag(CACHE_TAGS.cars)`, plus `buyNowCars` / `auctionCars` if the car can
  reach the homepage.
- The single-argument `revalidateTag(tag)` form recommended in
  [`cache-tags.ts:40`](../apps/web/src/lib/cache-tags.ts#L40) is **deprecated**.
  `AGENTS.md`'s cache line predates `updateTag` — both should be updated.
- **There is no per-car tag today**, so one deindex blows away the entire ~945k-key
  `getCarDetail` remote cache *and* the `cacheLife("days")` sitemap cache. **Add
  `cacheTag(\`car-${id}\`)` inside `getCarDetail`** as part of this work.
- `router.refresh()` in the client after an action that already calls `updateTag` /
  `revalidatePath` is redundant — the action response already carries a re-rendered
  RSC payload.

> **Fix a misleading comment while you're here.** [`next.config.ts`](../apps/web/next.config.ts)
> states *"We use plain `use cache` (in-memory LRU), NOT `use cache: remote`"*. That is
> **stale** — `get-car-detail.query.ts:53` and `get-car-facets.query.ts:166` both
> literally declare `"use cache: remote"`, and `cache-tags.ts:17-27` documents the
> durable Vercel Runtime Cache. Anyone planning off `next.config` would conclude no
> cross-instance cache exists and skip the tag expiry, leaving a paid-for delisted car
> served from cache.

### 3.7 External search engines — what can and cannot be automated

| Engine | Automatable? | Mechanism | Timing |
|---|---|---|---|
| **Google** | **No** | Removals tool — manual, owner-only | ~24h, **expires ~6 months**, "not guaranteed to be accepted" |
| **Google** (permanent) | Yes (site side) | 410 from proxy | honoured on next crawl — Google warns "may take months" |
| **Bing** | **Yes** | Webmaster API `AddBlockedUrl` | 90-day max, auto-expires, can be refused |
| **Bing/Yandex/Naver/Seznam/Yep** | **Yes** | IndexNow (explicitly supports deleted URLs) | instant *notification* only |
| **Google via IndexNow** | **No** | Google is not an IndexNow participant | — |

- **Search Console API has no removals resource.** Its complete method set is
  `searchanalytics`, `sitemaps`, `sites`, `urlInspection`.
- **Indexing API has a `URL_DELETED` type but is hard-restricted** to `JobPosting` and
  `BroadcastEvent`. Out of policy for car listings — do not build it.
- **Current Google docs say 410 is *not* treated differently from 404** ("All 4xx
  errors, except 429, are treated the same"). Choose 410 for semantics, Bing, and
  crawl budget — **not** for a speed claim to the customer.
- **IndexNow** needs one new static route serving a `{key}.txt` file at site root,
  alongside the existing `robots.ts` / `sitemap.ts`. Cheap.
- **Ordering matters for Bing's Content Removal tool** — it verifies the URL is
  actually gone before accepting. Ship the 410 first.

**Admin action therefore = automatable parts + a human checklist**: flip flag →
recompute → `updateTag` → IndexNow ping → Bing `AddBlockedUrl` → surface a deep link
into Search Console with a status field the customer-facing side can report on.

### 3.8 What the paid product honestly cannot deliver

State these in the T&Cs rather than planning technical controls that cannot exist:

- **Car photos are not ours.** [`next.config.ts`](../apps/web/next.config.ts) documents
  that *"Every auction/car photo is served DIRECTLY from its source CDN through a plain
  `<img>`"*. No `X-Robots-Tag` of ours can apply. Deindexing removes the *referring
  page* from Google Images; the image files stay live on Copart/IAAI/Encar and remain
  indexable via any other site that embeds them.
- **AI answer engines.** [`robots.ts`](../apps/web/src/app/robots.ts) explicitly
  *allows* GPTBot, ClaudeBot, PerplexityBot, CCBot et al., and `public/llms.txt`
  invites catalog ingestion. Content already ingested has **no removal mechanism**.
  Either scope the promise to Google/Bing and say so, or add crawler directives —
  noting they are advisory and retroactively useless.
- **Third-party copies.** If a listing was ever syndicated, deindexing our site does
  not touch those copies. Google's Refresh Outdated Content tool is explicitly for
  non-owners and is the only recourse.
- **`/proverka-vin`** will still report auction records (§3.4).

### 3.9 What the customer receives

"It's gone from Google" cannot be guaranteed, so the deliverable should be an artifact
plus a live status. The repo already has everything needed and it should be reused:
`@react-pdf/renderer` templates in `apps/web/src/pdf/`, the append-only versioned
`generated_documents` table with immutable jsonb snapshots, S3 via `lib/s3.ts`, and the
auth'd download route pattern at `api/payment-document/[id]`.

→ A versioned **delisting certificate** PDF + a per-request status record
(*410 live since X · Google removal requested Y · IndexNow submitted Z · Bing blocked until W*).

### 3.10 Admin lookup

The customer will send a VIN or a pasted URL, never a `car_id`. The admin lookup must
accept **VIN / lot number / `/avtomobil/{id}` URL** and show **all** matching car ids
(§3.1) so the operator can see exactly what will be suppressed.

---

## 4. Business prerequisites (flagged, not designed — decision 4)

These are outside the technical build but each can independently block or damage a
launch. Resolve before selling the feature.

1. **Ownership verification.** There is none in the plan, and the requester is not a
   site user — no account, no session, nothing to attach a request to. The same
   one-click button lets a competitor erase a rival dealer's live inventory, and lets
   a seller suppress salvage/damage history from a buyer — the exact fraud the site's
   trust proposition exists to prevent. Decide: what proof (талон / договор за
   покупко-продажба / ID), who reviews it, is it stored (a new GDPR processing purpose
   with its own retention), and what is the refusal path.
2. **The privacy policy already promises free erasure.**
   [`politika-za-poveritelnost`](../apps/web/src/app/politika-za-poveritelnost/page.tsx)
   publicly offers GDPR rights including *„правото да бъдеш забравен"*, and Art.12(5)
   requires data-subject requests be answered free of charge; a VIN can be personal
   data where linkable to a natural person (CJEU C-319/22). Charging a private
   individual for what the site offers free is a direct conflict. Likely resolution:
   scope the paid product to trade/commercial requesters and route self-identified
   data subjects to a free path. **Needs a Bulgarian lawyer, not a developer.**
3. **No invoicing or VAT path.** The entity is VAT-registered (`BG208786079`) and the
   repo issues no фактури anywhere — only contract PDFs and payment notices. The
   `contracts` table is hard-shaped to car import (a `market` enum of us/ca/kr/eu, five
   fixed amount пера, four mandatory payment stages), so a one-line delisting fee does
   not fit without schema work. If the fee is taken in cash/card at the office,
   Наредба Н-18 applies.
4. **Consumer withdrawal right.** `obshti-usloviya` §8 defers the 14-day distance-selling
   right to "индивидуалния договор". A service performed *immediately* needs the
   consumer's explicit prior consent plus acknowledgement that the right is lost on
   commencement, captured as an artifact — otherwise refunds are owed for 14 days on
   something that cannot be un-performed.
5. **Reversal, expiry, chargeback.** Undefined. This determines the data shape: a
   boolean, a `deindexed_at` timestamp, or a request row with a validity window. Note a
   410 already honoured by Google is slow to recover, and a Bing block must be
   explicitly lifted via `RemoveBlockedUrl` or it persists up to 90 days.
6. **Feature A scope sanity check.** The „Безплатна консултация" lead type collects
   name + phone and has **no email column at all**; the browser extension ships a
   dedicated Viber module; `BUSINESS` exposes two phone lines. This business may run
   largely on phone and Viber. The Resend Receiving tab can quantify real inbound
   volume today — worth checking before committing to inbox + composer + threading +
   attachments + retention.
7. **GDPR retention for the mail archive.** The current policy describes *account*
   data ("докато имате активен профил"). An indefinite archive of arbitrary inbound
   email will contain ЕГН, ID scans, талони and bank details. New processing purpose,
   no stated retention, no deletion job, and erasure requests must now reach the mail
   archive and its S3 attachment copies.

---

## 5. Suggested sequencing

| Step | Feature | Status |
|---|---|---|
| 1 | Confirm Resend dashboard: receiving on, unread backlog | ✅ receiving confirmed ON + catch-all; backlog explicitly out of scope |
| 2 | Publish `_dmarc` TXT | ⬜ **still open** — verified absent 2026-08-14 |
| 3 | Phase-0 forward webhook | ✅ done — `api/resend-inbound` + `lib/inbound-mail.ts` |
| 4 | Migration `00XX_admin_mail` + webhook + lazy body fetch + reconcile cron | ⬜ |
| 5 | `/admin/poshta` inbox + reply mutation | ⬜ |
| 6 | Migration `0043_car_deindex` + `0044_cars_vin_normalized_idx` (additive) | ✅ applied 2026-08-14, verified |
| 7 | Proxy 410 + per-car cache tag + `getCarDetail` null | ✅ done, verified live on an active car |
| 8 | Full read-path exclusion (§3.4) + `_counted` recompute in the mutation | ⬜ — the bulk |
| 9 | `/admin` deindex UI + IndexNow + Bing API + certificate PDF | ⬜ |
| 10 | Audit-log viewer (§1.2) | ⬜ |

Steps 6–7 alone already deliver a verifiable "the URL is dead" to a paying customer;
step 8 is what stops the car appearing anywhere else on the site.

### What shipped 2026-08-14

**Feature A, phase 0.** `POST /api/resend-inbound` verifies the Standard-Webhooks
signature (via the `standardwebhooks` package the Resend SDK already bundles — svix
is NOT a dependency), filters on `received_for` against an allowlist, and forwards
matching mail with an `email_id`-derived idempotency key. Probe-tested: forged
signature → 400, body tampered after signing → 400 (proving raw-body handling),
missing headers → 400, unhandled event type → 200-ignored, non-allowlisted recipient
→ skipped with no API call. **Env still needed in Vercel:** `RESEND_WEBHOOK_SECRET`
(from the Resend webhook endpoint) and `MAIL_FORWARD_TO`.

> Gotcha worth remembering: `MAIL_FORWARD_ADDRESSES=` (empty, not unset) reaches the
> app as `""`, so a `??` default would have silently relayed the entire catch-all.
> The code now treats unset **and** empty as the safe default and requires the literal
> `*` to opt into the catch-all.

**Feature B, schema + hard signal.** Migrations 0043/0044 applied to production and
verified: column present, all four indexes VALID (including the `CONCURRENTLY` one,
run through Neon's DIRECT endpoint because PgBouncer breaks concurrent index builds),
the CHECK rejects un-normalised VINs, and the partial unique permits a re-request
after revoke. The 410 was proven live on an ACTIVE car — 200 → flag → 410 +
`x-robots-tag: noindex` → unflag → 200, no cache lag — and the merged predicate was
regression-tested against real archived rows at varying thresholds.
