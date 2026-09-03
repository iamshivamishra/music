import { Shield, Mic2, User, type LucideIcon } from "lucide-react";
import type { UserRole } from "@/types";

export interface DashboardConfig {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function getDashboardConfig(role?: UserRole): DashboardConfig {
  switch (role) {
    case "admin":
      return { href: "/admin", label: "Admin", icon: Shield };
    case "producer":
      return { href: "/studio", label: "Studio", icon: Mic2 };
    default:
      return { href: "/profile", label: "Profile", icon: User };
  }
}

export const NAV_LINKS = [
  { href: "/beats", labelKey: "browse" },
  { href: "/beat-packs", labelKey: "packs" },
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
] as const;

/** True only for the longest matching nav href (avoids `/profile` lighting up `/profile/packs`). */
export function isNavActive(
  pathname: string,
  href: string,
  siblings: readonly string[]
): boolean {
  const matches = siblings.filter(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`)
  );
  if (matches.length === 0) return false;
  const best = matches.reduce((a, b) => (a.length >= b.length ? a : b));
  return best === href;
}
