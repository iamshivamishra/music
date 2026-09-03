import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Users, Music, ShoppingBag, Wallet, Crown, Mail, Star, ClipboardList, Scale } from "lucide-react";
import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";

const allNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/beats", label: "Beats", icon: Music },
  { href: "/admin/sales", label: "Sales", icon: ShoppingBag },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/producers", label: "Producers", icon: Crown },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/admin/waitlist", label: "Waitlist", icon: ClipboardList },
  { href: "/admin/featured", label: "Featured", icon: Star },
  { href: "/admin/jobs", label: "Jobs", icon: Scale, flag: "customServices" as const },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") notFound();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border/50 bg-player-bg p-3 lg:w-56 lg:border-b-0 lg:border-r lg:p-4">
        <div>
          <div className="mb-3 flex items-center justify-between px-1 lg:mb-6 lg:px-2">
            <h2 className="text-lg font-bold">Admin</h2>
            <Link
              href="/studio"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-player-muted transition-colors hover:bg-white/5 hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {allNavItems
            .filter((item) => !("flag" in item && item.flag) || isFeatureEnabled(item.flag))
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-admin-muted transition-colors hover:bg-white/5 hover:text-foreground lg:flex"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto hidden pt-4 lg:block">
          <Link
            href="/studio"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-player-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/studio" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Admin</span>
        </div>
        {children}
      </main>
    </div>
  );
}