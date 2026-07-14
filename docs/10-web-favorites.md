# 10 — Website: Favourites (saved cars)

The `apps/web` (Next.js 16, App Router, Cache Components/PPR) **favourites**
feature: a per-user "save a car" toggle (the heart on every card + a `/lyubimi`
list). It sits on top of the authentication in
[09-web-authentication.md](09-web-authentication.md) — read that first for the
session model. The `favorites` **table shape** is in
[02 §H](02-data-model-and-tables.md) + migration
[`0019_auth.sql`](../packages/db/migrations/0019_auth.sql).

---

## 1. What it is

One row per **(user, car)**, keyed on the **stable `cars.id`** — the same car
identity used across `car_listings` / `CarView.id` / `/avtomobil/[id]` — so a
favourite **survives a lot being relisted or archived**. The composite PK
`(user_id, car_id)` makes a favourite a **set membership**: the toggle is
idempotent, a double-click can't create duplicates.

Auth is gated **per-action** (never in the proxy), so the whole catalog stays
public and cacheable; only the favourite *writes* require a signed-in user.

The heart is visible to everyone (discoverable). Signed-**out** → a click routes to
`/sign-in?redirectTo=<current>` (no write attempted). Signed-**in** → it toggles.

---

## 2. Why a client context (not per-card server reads)

The catalog grid is **virtualised** — cards mount/unmount as they scroll, so a card
can't fetch its own favourite state server-side. Instead
[`FavoritesProvider`](../apps/web/src/contexts/favorites-context.tsx) holds the user's full favourite-id **Set** and every
[`FavoriteButton`](../apps/web/src/components/cars/favorite-button.tsx) reads its filled/empty state synchronously by `carId`.

**Self-seeds on the client:** seeding server-side would mean calling `auth()` in the
root layout, which reads request headers and would force the whole static shell
dynamic under `cacheComponents`. Instead the provider fetches the ids on mount via
the `getMyFavoriteIds` action once the session reports signed-in (signed-out → empty
Set). It re-seeds when the user id changes (account switch).

The context exposes:

| Field | Meaning |
|---|---|
| `isFavorite(carId)` | membership check (synchronous, for every heart) |
| `setFavorite(carId, favorited)` | optimistic write-back; only allocates a new Set when membership actually changes (so unrelated cards don't re-render) |
| `initialized` | **false until the id-Set has resolved** for the current user — consumers that HIDE content on membership must wait for this (see §4) |

The provider is mounted once at the root, so the homepage carousels, the catalog
grid, the detail page, and `/lyubimi` all share **one synced set**.

---

## 3. Read + write paths

| File | Kind | Role |
|---|---|---|
| [`queries/favorites/get-favorite-car-ids.query.ts`](../apps/web/src/queries/favorites/get-favorite-car-ids.query.ts) | server read | the id-Set to seed hearts; `auth()`-gated, returns `[]` signed-out; **uncached** (per-user, request-scoped — caching would risk cross-user leakage; it's one index scan on `favorites_user_idx`) |
| [`mutations/favorites/get-my-favorite-ids.action.ts`](../apps/web/src/mutations/favorites/get-my-favorite-ids.action.ts) | `"use server"` | thin action exposing the above to the client provider |
| [`queries/favorites/get-favorite-cars.query.ts`](../apps/web/src/queries/favorites/get-favorite-cars.query.ts) | server read | full `CarView[]` for `/lyubimi` (see §4) |
| [`mutations/favorites/toggle-favorite.mutation.ts`](../apps/web/src/mutations/favorites/toggle-favorite.mutation.ts) | `"use server"` | the toggle (see below) |
| [`components/cars/favorite-button.tsx`](../apps/web/src/components/cars/favorite-button.tsx) | client | the heart; on grid cards + detail page |

**The toggle** (`toggleFavorite(carId)`):

1. `auth()` — no user → `{success:false}` with **no DB write** (defence-in-depth: a
   Server Action is a public endpoint reachable by direct POST; the heart also sends
   signed-out users to `/sign-in` *before* this runs).
2. validate `carId` is a positive integer.
3. `INSERT … ON CONFLICT DO NOTHING … RETURNING` on the composite PK — a row back
   means newly **favourited**; no row means it already existed, so **DELETE** it (now
   un-favourited). A bad `car_id` trips the FK → caught, clean error.

**The heart is optimistic:** [`FavoriteButton`](../apps/web/src/components/cars/favorite-button.tsx) flips `FavoritesContext`
immediately, then reconciles with the server's returned `favorited` state (rolling
back on failure — e.g. a session that expired between render and click). The shared
context keeps every mounted copy of a card (grid + detail + `/lyubimi`) in sync.

---

## 4. The `/lyubimi` page + live removal

[`app/lyubimi/page.tsx`](../apps/web/src/app/lyubimi/page.tsx): static shell streams; the body reads `auth()` in a
`<Suspense>` (request-time). Signed-**out** → a sign-in prompt. Signed-**in** →
`getFavoriteCars()` → handed to the **client** [`FavoritesGrid`](../apps/web/src/components/cars/favorites-grid.tsx).

**`getFavoriteCars`** returns the saved cars as `CarView[]`, newest-favourited
first. A favourite's `car_id` can live in **either** read model, so it joins
favourites to **both** `car_listings` (active) and `car_listings_archived` (past)
separately and maps each with the right `isPast` flag (active card = full CTA; past
card = "Продаден" result). The two sets are concatenated **active-first**. A
favourite whose car has dropped out of both tables simply doesn't appear (no broken
card). Uncached (per-user, request-scoped).

**`FavoritesGrid`** (client) renders the bounded set with the catalog `AuctionCard`
(no infinite scroll — favourites are bounded), and:

- **drops a card the moment its heart is un-toggled** (reads the shared context),
  instead of leaving it until the next navigation;
- owns the **empty state** (so removing the last favourite reveals it with no
  round-trip).

> **No-flicker rule.** `FavoritesGrid` filters by the context **only after
> `initialized`** is true. Until the id-Set has seeded, it renders the server list
> verbatim — otherwise the pre-seed empty Set would briefly hide **every** card.
> Once seeded, the set contains exactly these cars, so nothing disappears except
> genuine removals.

The page is `robots: { index: false, follow: false }` (a private, per-user list).
`UserMenu` (doc 09) links here as "Любими автомобили".

---

## 5. Build / verify

```bash
pnpm --filter @auctions-ingestion/web run type-check
pnpm --filter @auctions-ingestion/web run lint
pnpm --filter @auctions-ingestion/web run dev        # sign in, then http://localhost:3000/lyubimi
```

**Verified end-to-end in a real browser (2026-07-14):** a signed-in user with 3
seeded favourites opens `/lyubimi` → 3 cards render; clicking one card's heart
(un-favourite) **removes that card immediately with no reload** (URL unchanged) and
the removal **persists server-side** (the card stays gone after a reload). The
optimistic toggle + `initialized`-gated filter behave exactly as designed.

---

## 6. Status & deliberate gaps

- **Built + verified:** the heart toggle (grid + detail), the shared optimistic
  context, and the `/lyubimi` list with live removal + server persistence.
  Type-check/lint green.
- **By design:** favourites are **not** cached (per-user), and there's no server-side
  seed in the layout (would force the shell dynamic under `cacheComponents`) — the
  client self-seed is the deliberate trade-off.
