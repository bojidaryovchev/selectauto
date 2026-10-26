import {
  BankIcon,
  CalculatorIcon,
  ClockIcon,
  DashboardIcon,
  EyeOffIcon,
  FileSearchIcon,
  FileTextIcon,
  MailIcon,
  MegaphoneIcon,
  MessageIcon,
  PercentIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import type { AdminNavIconName } from "@/constants/admin-nav";

const ICONS: Record<AdminNavIconName, (props: { className?: string }) => React.ReactNode> = {
  dashboard: DashboardIcon,
  mail: MailIcon,
  carfax: FileSearchIcon,
  inquiry: MessageIcon,
  offer: CalculatorIcon,
  contracts: FileTextIcon,
  deposits: WalletIcon,
  mobilebg: MegaphoneIcon,
  hidden: EyeOffIcon,
  tariffs: PercentIcon,
  recipients: BankIcon,
  users: UsersIcon,
  log: ClockIcon,
};

/** The glyph for a nav item's icon key (constants/admin-nav.ts). */
export function AdminNavIcon({ name, className }: { name: AdminNavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
