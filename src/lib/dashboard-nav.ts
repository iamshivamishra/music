import {
  LayoutDashboard,
  Music,
  PackageOpen,
  Upload,
  User,
  Shield,
  BarChart3,
  Settings,
  Ticket,
  Library,
  Receipt,
  Wallet,
  ShieldCheck,
  Users,
  UserPlus,
  LineChart,
  Briefcase,
  ListTodo,
  Store,
  Handshake,
  Mail,
  Calculator,
  type LucideIcon,
} from "lucide-react";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  flag?: FeatureFlag;
  producerOnly?: boolean;
  adminOnly?: boolean;
}

export const WORKSPACE_NAV: DashboardNavItem[] = [
  { href: "/studio", label: "Overview", icon: LayoutDashboard, producerOnly: true },
  { href: "/studio/beats", label: "My Beats", icon: Music, producerOnly: true },
  { href: "/studio/beat-packs", label: "Beat Packs", icon: PackageOpen, producerOnly: true },
  { href: "/studio/store", label: "Store", icon: Store, producerOnly: true, flag: "linkInBioStore" },
  { href: "/studio/sales", label: "Sales", icon: BarChart3, producerOnly: true },
  { href: "/studio/collabs", label: "Collabs", icon: UserPlus, producerOnly: true, flag: "collabSplits" },
  { href: "/studio/analytics", label: "Analytics", icon: LineChart, producerOnly: true, flag: "sourceAnalytics" },
  { href: "/studio/customers", label: "Customers", icon: Users, producerOnly: true, flag: "buyerCrm" },
  { href: "/studio/leads", label: "Leads", icon: Mail, producerOnly: true, flag: "freeDownloadLeads" },
  { href: "/studio/coupons", label: "Coupons", icon: Ticket, producerOnly: true },
  { href: "/studio/services", label: "Services", icon: Briefcase, producerOnly: true, flag: "customServices" },
  { href: "/studio/jobs", label: "Jobs", icon: ListTodo, producerOnly: true, flag: "customServices" },
  { href: "/studio/offers", label: "Offers", icon: Handshake, producerOnly: true, flag: "customOffers" },
  { href: "/studio/payouts", label: "Payouts", icon: Wallet, producerOnly: true },
  { href: "/studio/tax", label: "Tax", icon: Calculator, producerOnly: true, flag: "producerTaxPack" },
  { href: "/upload", label: "Upload", icon: Upload, producerOnly: true },
];

export const LIBRARY_NAV: DashboardNavItem[] = [
  { href: "/profile/library", label: "My Library", icon: Library },
  { href: "/profile/jobs", label: "My Jobs", icon: Briefcase, flag: "customServices" },
  { href: "/profile/beats", label: "My Beats", icon: Music },
  { href: "/profile/packs", label: "My Packs", icon: PackageOpen },
  { href: "/profile/transactions", label: "Transactions", icon: Receipt },
  { href: "/profile/verify-license", label: "Verify License", icon: ShieldCheck },
];

export const ACCOUNT_NAV: DashboardNavItem[] = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, producerOnly: true },
];

function isVisible(
  item: DashboardNavItem,
  opts: { isProducer: boolean; isAdmin: boolean }
): boolean {
  if (item.adminOnly && !opts.isAdmin) return false;
  if (item.producerOnly && !opts.isProducer) return false;
  if (item.href === "/settings") return false;
  if (item.flag && !isFeatureEnabled(item.flag)) return false;
  return true;
}

export function getDashboardNav(role?: string) {
  const isProducer = role === "producer" || role === "admin";
  const isAdmin = role === "admin";
  const opts = { isProducer, isAdmin };
  return {
    workspace: WORKSPACE_NAV.filter((item) => isVisible(item, opts)),
    library: LIBRARY_NAV.filter((item) => isVisible(item, opts)),
    account: ACCOUNT_NAV.filter((item) => isVisible(item, opts)),
  };
}
