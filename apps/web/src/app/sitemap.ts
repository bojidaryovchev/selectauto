import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";
import { getAllPosts } from "@/lib/blog";

/**
 * Root sitemap (`/sitemap.xml`) — the indexable STATIC pages only. Together with
 * the make/model hub sitemap (`/avtomobili/marka/sitemap.xml`) this is now the
 * WHOLE advertised surface: the ~945k per-car listing chunks were retired on
 * 2026-08-16 because they earned ~0.4 organic visits/month while accounting for
 * ~99% of the site's traffic and cost. See the rationale block in `robots.ts`.
 *
 * URLs are the canonical SLASHLESS form (the app runs `trailingSlash: false`, so
 * a trailing-slash URL 308-redirects to slashless — the slashless form is what we
 * want indexed). Excluded: `/lyubimi` + the auth/account pages (`/sign-in`,
 * `/registratsiya`, `/verify`, `/zabravena-parola`, `/nova-parola` — all
 * noindex) and the `?status=past` view (noindex). Static — no request-time API,
 * no DB.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    entry("", "daily", 1), // home
    entry("/vsichki-avtomobili", "hourly", 0.9), // catalog (active)
    entry("/proces", "monthly", 0.6),
    entry("/carfax", "monthly", 0.7),
    entry("/za-nas", "monthly", 0.6),
    entry("/otzivi", "monthly", 0.6), // customer reviews
    entry("/kontakti", "yearly", 0.6),
    entry("/kalkulator", "monthly", 0.8), // import-cost calculator
    entry("/lizingov-kalkulator", "monthly", 0.8), // leasing / monthly-payment calculator
    entry("/byudzheten-kalkulator", "monthly", 0.8), // budget / affordability calculator
    entry("/proverka-vin", "monthly", 0.8), // VIN / Carfax availability checker
    entry("/chesto-zadavani-vaprosi", "monthly", 0.7), // FAQ hub
    entry("/vnos-na-koli-ot-korea", "weekly", 0.9), // Korea country hub (flagship money page)
    entry("/vnos-na-koli-ot-sasht", "weekly", 0.9), // USA country hub
    entry("/vnos-na-koli-ot-kanada", "weekly", 0.9), // Canada country hub
    entry("/obshti-usloviya", "yearly", 0.2), // Terms & Conditions (ЗЕТ/ЗЗП)
    entry("/politika-za-poveritelnost", "yearly", 0.2),
    entry("/politika-za-biskvitki", "yearly", 0.2), // Cookie Policy (ePrivacy)
    // Blog: the index + every markdown post (content/blog — build-time fs read;
    // lastModified = the post's own `updated` frontmatter, not build time).
    entry("/blog", "weekly", 0.7),
    ...getAllPosts().map(
      (p): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: new Date(p.updated),
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    ),
  ];
}
