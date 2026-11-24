/**
 * Where a lead came from, read from the page address stored with it (`page_url`): the forms send the full address,
 * so an ad's tags arrive with the lead whenever the visitor sends it from the page the ad opened — the /zapitvane page
 * is built for that (owner decision 40). Shown in the admin's lead details as „Източник" and „Кампания"
 * (lib/admin-lead-view.ts; board `ad-inquiries-drawer`).
 *
 * - The source is `utm_source`, with `utm_medium` after it („google · cpc"). Without UTM tags, Google Ads' own click
 *   ids (`gclid`, `gbraid`, `wbraid`, added by its auto-tagging) give „Google Ads", and `fbclid` gives „Facebook"
 *   (Facebook adds it to every link people open from it, ads or not).
 * - The campaign is `utm_campaign`. Auto-tagging alone carries no campaign name; Google Ads knows it from the click id.
 *
 * No imports, so the unit test can load it as it is (tests/lead-source.test.mts).
 */
export type LeadSource = { source?: string; campaign?: string };

export function leadSource(pageUrl: string | null | undefined): LeadSource {
  if (!pageUrl) return {};
  let params: URLSearchParams;
  try {
    params = new URL(pageUrl).searchParams;
  } catch {
    return {};
  }
  const tag = (name: string) => params.get(name)?.trim() || undefined;

  const utmSource = tag("utm_source");
  const utmMedium = tag("utm_medium");
  let source: string | undefined;
  if (utmSource) source = utmMedium ? `${utmSource} · ${utmMedium}` : utmSource;
  else if (tag("gclid") || tag("gbraid") || tag("wbraid")) source = "Google Ads";
  else if (tag("fbclid")) source = "Facebook";

  const result: LeadSource = {};
  if (source) result.source = source;
  const campaign = tag("utm_campaign");
  if (campaign) result.campaign = campaign;
  return result;
}
