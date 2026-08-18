import type { LinkItem } from "@/types/nav.type";

/**
 * Cars per page in the /vsichki-avtomobili catalog feed. Lives here (not in the
 * query module) so the CLIENT grid can use it for page-boundary math WITHOUT
 * importing the server-only query barrel (which pulls `cacheTag`/`cacheLife` into
 * the client bundle). The query re-exports it for existing server consumers.
 */
export const CARS_PAGE_SIZE = 24;

/** Primary contact details, shown in the header, footer and contacts page. */
export const CONTACT = {
  phone: "+359 898 980 011",
  phoneHref: "tel:+359898980011",
  email: "info@selectauto.bg",
  emailHref: "mailto:info@selectauto.bg",
} as const;

/** Social profiles, verbatim from the site footer. */
export const SOCIALS: LinkItem[] = [
  { label: "Facebook", href: "https://www.facebook.com/SelectAuto.bg/" },
  { label: "Instagram", href: "https://www.instagram.com/selectauto.bg" },
  { label: "TikTok", href: "https://www.tiktok.com/@selectauto.bg" },
  {
    label: "Viber",
    href: "https://invite.viber.com/?g2=AQBHAJSWFG7zmFY40zbZAiy2neG7t4Y%2BzZIKiOYHSvhDZZV9wFmtnX6E0lEhIF2Q",
  },
];

/**
 * Canonical production origin (no trailing slash). Single source of truth for
 * `metadataBase`, canonical URLs, JSON-LD `@id`/`url`, robots + sitemap. Was
 * previously hardcoded as a local `SITE_URL` const in `avtomobil/[id]/page.tsx`;
 * keep that page in sync (or import this). Overridable per-environment via
 * `NEXT_PUBLIC_SITE_URL` (e.g. a preview deploy) without code changes.
 *
 * **The default MUST be the `www` host.** Vercel serves the site on
 * `www.selectauto.bg` and 308-redirects the apex. When this defaulted to the
 * apex, every canonical, `og:url`, robots `Host:` and sitemap `<loc>` pointed at
 * a URL that redirects — an OpenSEO crawl of 120 pages on 2026-08-18 returned
 * **119 non-indexable 308s**, all of them sitemap-submitted, plus a
 * `canonicalized-page` flag on the homepage (`www` → canonical apex). Google
 * resolves it, but at ~945k listing URLs that is pure crawl waste and a sitemap
 * coverage report full of "Page with redirect". See
 * docs/14-market-research-2026-08.md §6.1.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.selectauto.bg").replace(/\/$/, "");

/** Brand/legal name shown in metadata + Organization schema. */
export const SITE_NAME = "SelectAuto";

/**
 * One-line business description (BG), reused for the Organization/AutoDealer
 * schema `description` and as a default OG description. Mirrors the footer copy.
 */
export const SITE_DESCRIPTION =
  "Специализирани сме във внос на автомобили от Корея, САЩ и Канада — от правилен подбор и проверка, до логистика, съдействие и финално предаване на автомобила.";

/**
 * Physical location + structured business data — the single source for the
 * `LocalBusiness`/`AutoDealer` JSON-LD and the contacts page. Values verified
 * against `components/contacts/contact-cards.tsx` (address, second phone, hours)
 * and `CONTACT`. Geo coordinates are for ул. Север 64, Пловдив (the showroom the
 * contacts-page Google map embeds).
 */
export const BUSINESS = {
  legalName: "SelectAuto",
  /**
   * Registered legal-entity identity for the „provider identification" block
   * required by Закона за електронната търговия (ЗЕТ) чл. 4 — surfaced in the
   * footer bottom bar + the Общи условия page, and (legalName/taxID/vatID) in the
   * Organization/AutoDealer JSON-LD. Verified against the Търговски регистър
   * (ЕИК 208786079, state 31.05.2026). NOTE: `registeredOffice` (седалище) is the
   * legal seat and is DIFFERENT from the showroom (`streetAddress` below) — the
   * showroom is the place of activity / map pin; both are shown where relevant.
   */
  registeredName: "Селектауто Импорт ЕООД", // наименование + правна форма, както е в ТР (ЕИК 208786079)
  companyId: "208786079", // ЕИК
  vatId: "BG208786079", // ДДС номер — потвърдено валиден в EU VIES (BG + ЕИК)
  /** Управител / едноличен собственик на капитала (от ТР). Not rendered publicly by
   *  default; available for legal copy / schema if needed. */
  representative: "Валентин Кичуков",
  /** Седалище и адрес на управление (legal seat) — ЗЕТ чл. 4. Different from the
   *  showroom; used only for provider identification, not the map/geo. */
  registeredOffice: {
    streetAddress: "р-н Южен, ж.к. Христо Ботев - север, ул. Лазо войвода № 19, ет. 6, ап. 10",
    city: "Пловдив",
    postalCode: "4030",
    country: "BG",
  },
  /** Showroom / place of activity street address (BG) — the map pin + LocalBusiness. */
  streetAddress: "ул. Север 64",
  city: "Пловдив",
  /** ISO 3166-1 alpha-2. */
  country: "BG",
  postalCode: "4003",
  /** Second public phone line (contacts page only). `CONTACT.phone` is primary. */
  secondaryPhone: "+359 898 808 661",
  /**
   * Exact showroom coordinates (Пловдив, ул. Север 64) — the pin the live
   * selectauto.bg Google Maps embed uses. Consumed by the contacts-page map
   * embed and the LocalBusiness/AutoDealer JSON-LD `geo`.
   */
  geo: { latitude: 42.158979, longitude: 24.696925 },
  /**
   * Opening hours in schema.org `OpeningHoursSpecification` shape. Mirrors the
   * `HOURS` table on the contacts page (Mon–Fri 09–18, Sat 09–17, Sun 11–17).
   */
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    { days: ["Saturday"], opens: "09:00", closes: "17:00" },
    { days: ["Sunday"], opens: "11:00", closes: "17:00" },
  ],
} as const;

/**
 * Thin-content guard threshold for the make/model SEO hubs
 * (`/avtomobili/marka/{make}/{model}`): a hub is INDEXABLE only when it has at
 * least this many live listings (docs/12-web-seo-strategy.md §4.3). SINGLE SOURCE OF TRUTH —
 * the hub page uses it for its `robots` directive AND the hub sitemap uses it to
 * decide which URLs to emit, so the sitemap can never list a `noindex` hub (which
 * Google flags as a contradiction). Below it the page still renders for users but
 * stays out of the index. Client-safe (a plain number). Tune as inventory settles.
 */
export const MIN_HUB_LISTINGS_TO_INDEX = 3;

/**
 * How long after a lot is archived before its `/avtomobil/{id}` page returns
 * **410 Gone** instead of the `noindex` sold-lot page (see
 * docs/11-web-seo-and-indexing.md §3). Just-sold lots keep the `noindex, follow`
 * page (link equity + users arriving from shared links); once a lot is this old,
 * 410 is the stronger de-index signal and stops Google re-crawling dead content.
 * Postgres-interval string, read by `proxy.ts`. Conservative at 90 days.
 */
export const SOLD_LOT_410_AFTER = "90 days";

/**
 * KRW → USD divisor for the ENCAR (Korea) detail sections. The AuctionsAPI already
 * converts a lot's HEADLINE price (buy-now / bid / final) to USD, but the nested
 * `raw_json.details.*` money — new-car `original_price` and every `insurance_v2`
 * accident cost — arrives in RAW Korean won and is NOT converted upstream. We show
 * those as an approximate USD figure (prefixed "~") using this fixed rate rather
 * than a live FX feed (a rough magnitude is all a buyer needs, and it keeps the page
 * server-static with no extra request). Refresh occasionally as the rate drifts.
 */
export const KRW_PER_USD = 1380;
