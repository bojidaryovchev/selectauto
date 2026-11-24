import {
  CalculatorIcon,
  ClockIcon,
  EyeOffIcon,
  FileCheckIcon,
  FileSearchIcon,
  FileTextIcon,
  LandmarkIcon,
  LayoutGridIcon,
  MailIcon,
  MegaphoneIcon,
  MessageIcon,
  PercentIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import type { AdminNavIconName } from "@/constants/admin-nav";

/** The boards' glyphs (`ad-shell-roles`): the kit's Lucide drawings. */
const ICONS: Record<AdminNavIconName, (props: { className?: string }) => React.ReactNode> = {
  dashboard: LayoutGridIcon,
  mail: MailIcon,
  carfax: FileSearchIcon,
  inquiry: MessageIcon,
  offer: CalculatorIcon,
  contracts: FileTextIcon,
  deposits: WalletIcon,
  reports: FileCheckIcon,
  mobilebg: MegaphoneIcon,
  hidden: EyeOffIcon,
  tariffs: PercentIcon,
  recipients: LandmarkIcon,
  users: UsersIcon,
  log: ClockIcon,
};

/** The glyph for a nav item's icon key (constants/admin-nav.ts). */
export function AdminNavIcon({ name, className }: { name: AdminNavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
