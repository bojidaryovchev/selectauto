import { MakePlate } from "@/components/common";
import { FlagCaIcon, FlagKrIcon, FlagUsIcon } from "@/components/icons";
import type { LeadMake, LeadMarket } from "@/types/admin.type";

const FLAGS: Record<LeadMarket, typeof FlagKrIcon> = { kr: FlagKrIcon, us: FlagUsIcon, ca: FlagCaIcon };

/**
 * A lead's value with the make's plate or the market's flag before it (boards `ad-carfax`, `ad-inquiries`,
 * `ad-offers` and their drawers; decision 8). Without either, just the text.
 */
export function LeadValue({ text, make, market }: { text: string; make?: LeadMake; market?: LeadMarket }) {
  if (!make && !market) return <>{text}</>;
  const Flag = market ? FLAGS[market] : null;
  return (
    <span className="ad-car">
      {make ? <MakePlate name={make.name} logo={make.logo} size="xs" /> : null}
      {Flag ? <Flag className="sa-flag" /> : null}
      <span className="min-w-0">{text}</span>
    </span>
  );
}
