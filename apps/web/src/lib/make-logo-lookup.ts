import { INQUIRY_BRAND_LOGOS } from "@/data/inquiry-brands";
import { getMakeIndex } from "@/queries/cars/get-make-index.query";

/** A make's logo by its name, as typed or picked on the site; null when none is known. */
export type MakeLogoLookup = (name: string) => string | null;

/**
 * The logo for a lead's make (boards `ad-carfax`, `ad-inquiries`, `ab-contracts`: the plate beside the car; decision 8). Leads and contracts
 * store the make as text: the car page's make, a name typed into a form, or the inquiry quiz's label. So it is
 * matched by name, ignoring case, against the makes the car cards use (`manufacturers`, cached for days), then against
 * the quiz's own labels and logos („Mercedes"). A make neither knows shows its two letters.
 */
export async function getMakeLogoLookup(): Promise<MakeLogoLookup> {
  const index = await getMakeIndex();
  const byName = new Map<string, string>();
  for (const { name, logo } of Object.values(index)) {
    if (logo) byName.set(name.trim().toLowerCase(), logo);
  }
  return (name) => byName.get(name.trim().toLowerCase()) ?? INQUIRY_BRAND_LOGOS[name.trim()] ?? null;
}
