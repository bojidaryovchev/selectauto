import { BUSINESS, CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIALS } from "@/constants";

/**
 * Site-wide Schema.org JSON-LD builders (companion to `car-detail-jsonld.ts`,
 * which handles the per-car Vehicle/Product/Offer markup). Each function returns
 * a plain object that a Server Component injects as
 * `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }} />`.
 *
 * Why these: 9/10 BG competitors ship NO structured data (see docs/12-web-seo-strategy.md
 * §5) — Organization/LocalBusiness/Breadcrumb/ItemList are the single biggest
 * low-effort rich-results + AI-Overview win. All values come from `@/constants`
 * (verified NAP/socials), so there's one source of truth.
 *
 * A stable `@id` (`${SITE_URL}#organization`) lets other nodes (LocalBusiness,
 * Article author, Offer seller) reference the same entity instead of redeclaring
 * it — the recommended way to build a connected entity graph.
 */

const ORG_ID = `${SITE_URL}#organization`;
const WEBSITE_ID = `${SITE_URL}#website`;

/** Absolute URL from a site-root-relative path (schema wants absolute URLs). */
function abs(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * The Organization, modeled as an `AutoDealer` (a `LocalBusiness` subtype that
 * fits a car-import dealer better than bare `Organization` and is eligible for
 * the same knowledge-panel/sameAs signals). NAP + socials from constants.
 * Emitted once, site-wide, from the root layout.
 */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": ORG_ID,
    name: SITE_NAME,
    legalName: BUSINESS.registeredName || BUSINESS.legalName,
    // ЕИК → taxID; ДДС № → vatID. Only emitted when the real values are present in
    // constants, so the graph never carries a placeholder identifier.
    ...(BUSINESS.companyId ? { taxID: BUSINESS.companyId } : {}),
    ...(BUSINESS.vatId ? { vatID: BUSINESS.vatId } : {}),
    url: SITE_URL,
    logo: abs("/logo.png"),
    image: abs("/autoselect.jpg"),
    description: SITE_DESCRIPTION,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.city,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: BUSINESS.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: SOCIALS.map((s) => s.href),
  };
}

/**
 * The WebSite node + a `SearchAction` pointing at the catalog's lot/VIN search
 * (`?q=`). This is what makes a site eligible for a Google sitelinks search box
 * and tells crawlers the canonical site name. Emitted once, site-wide.
 */
export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { "@id": ORG_ID },
    inLanguage: "bg",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/vsichki-avtomobili?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * A fuller `LocalBusiness`/`AutoDealer` node for the contacts page (same entity
 * as the site-wide org via `@id`, but with the physical-place emphasis a contact
 * page warrants). Reuses the org builder and tags the priceRange.
 */
export function buildLocalBusinessJsonLd(): Record<string, unknown> {
  return {
    ...buildOrganizationJsonLd(),
    priceRange: "$$",
    hasMap: `https://www.google.com/maps?q=${encodeURIComponent(`${BUSINESS.city}, ${BUSINESS.streetAddress}`)}`,
  };
}

/** One crumb: a visible name + the absolute URL of that step. */
export type Breadcrumb = { name: string; url: string };

/**
 * `BreadcrumbList` from an ordered crumb list. Pass site-root-relative or
 * absolute URLs — both are normalized to absolute. Mirrors the visible
 * breadcrumb nav so the two never diverge.
 */
export function buildBreadcrumbJsonLd(crumbs: Breadcrumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.url),
    })),
  };
}

/** One Q&A pair for an FAQPage. `answer` is plain text (no markup). */
export type FaqEntry = { question: string; answer: string };

/**
 * `FAQPage` from a list of Q&A pairs. Use on the calculator + country hubs +
 * any page with a visible FAQ block, keeping the markup in lockstep with the
 * rendered questions. Self-contained, citable answers are the AI-Overview /
 * Perplexity play (docs/12-web-seo-strategy.md §6). Only emit when the same Q&A is visible
 * on the page (Google requires FAQ markup to match on-page content).
 */
export function buildFaqJsonLd(entries: FaqEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}

/** Inputs for a blog post's Article node. Dates are ISO YYYY-MM-DD. */
export type ArticleInput = {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
};

/**
 * `Article` (BlogPosting) for /blog/{slug} — the E-E-A-T carrier: named author
 * (Person) + publisher (the site-wide AutoDealer entity via @id) + dates.
 * No rich-result promise implied — Article markup feeds entity understanding
 * and Bing/Copilot; the visible byline/dates are what readers (and AI) consume.
 */
export function buildArticleJsonLd(a: ArticleInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    description: a.description,
    url: abs(a.url),
    mainEntityOfPage: abs(a.url),
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    author: { "@type": a.authorName === "SelectAuto" ? "Organization" : "Person", name: a.authorName },
    publisher: { "@id": ORG_ID },
    inLanguage: "bg",
  };
}

/** One item in an ItemList: its canonical URL + (optional) display name. */
export type ItemListEntry = { url: string; name?: string };

/**
 * `ItemList` of URLs (used for the catalog's first SSR page of cars). Keep it a
 * plain URL list rather than embedding full `Product` nodes — the per-car
 * `Product`/`Offer` lives on each detail page (`car-detail-jsonld.ts`); the
 * catalog just signals the ordered set of listing URLs, which is the lightweight,
 * correct pattern for a paginated listing.
 */
export function buildItemListJsonLd(items: ItemListEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(it.url),
      ...(it.name ? { name: it.name } : {}),
    })),
  };
}
