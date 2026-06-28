<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project structure & conventions

`src/app/` holds **only Next.js files** — `layout.tsx`, route `page.tsx` files,
`api/*/route.ts`, `globals.css`, `favicon.ico`. Everything else lives in
dedicated `src/` folders (modeled on the `ecommerce-store` repo):

- `components/` — **exactly one component definition per file**, grouped by
  feature (`layout/`, `home/`, `carfax/`, `contacts/`, `about/`, `cars/`,
  `three/`, `inquiry/`, `common/`, `providers/`, `icons/`). A component with
  private sub-parts becomes a folder (e.g. `inquiry/inquiry-modal/` holds
  `inquiry-modal.tsx` + `quiz-step.tsx`, `quiz-option.tsx`, `main-button.tsx`).
  Each folder has a barrel `index.ts`. **Named exports** everywhere except
  route/layout files (Next needs default). Shared primitives: `common/`
  (`Container`, `Reveal`, `SectionHeader`).
- `components/icons/` — **all SVG icons** live here, one per file, each rendering
  a complete `<svg viewBox="0 0 24 24" …>` that accepts a `className`. No inline
  `<svg>` markup in feature components — import the icon instead. A label→icon
  lookup (e.g. socials) is plain `const` data, not a component.
- `queries/<entity>/*.query.ts` — server-side reads. Car queries use
  `"use cache"` + `cacheTag(CACHE_TAGS.…)` and fall back to static data on a DB
  miss. `cacheComponents: true` is enabled in `next.config.ts` (so data is
  dynamic-by-default + PPR; pages stream a static shell).
- `mutations/<entity>/*.mutation.ts` — writes. The inquiry flow is a
  `"use server"` action returning `ActionResult<T>`; the carfax route delegates
  to a shared (non-action) function. Validate → insert (required) → email
  (best-effort).
- `schemas/*.schema.ts` — zod, shared by client forms and server. Forms use
  react-hook-form + `zodResolver`.
- `types/` (`ActionResult`, `CarView`, …), `contexts/` (React Context for UI
  state — no Zustand), `lib/` (`db`, `email`, `phone`, `cache-tags`,
  `car-mapper`), `constants/`, `data/` (static content + `FALLBACK_*` listings).

Cache invalidation: when listings change, call
`revalidateTag(CACHE_TAGS.buyNowCars | auctionCars, "max")` (the single-arg form
is deprecated). DB schema/types come from `@auctions-ingestion/db/schema`; the
UI listing type is `CarView` (distinct from the DB `Car` row).

`RESTRUCTURE-PLAN.md` documents the full migration that produced this layout.
